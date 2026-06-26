import { useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useCrm } from '@/context/CrmContext';
import { toast } from 'sonner';
import { Upload, Download, AlertTriangle, FileText, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatGBP } from '@/lib/currency';
import type { DealStage, ForecastCategory } from '@/types/crm';

// ---------- Column auto-detection (Monday.com + generic) ----------
const COLUMN_ALIASES: Record<string, string[]> = {
  deal_name: ['deal_name', 'name', 'deal', 'opportunity', 'title'],
  company_name: ['company_name', 'company', 'accounts', 'account', 'client', 'customer'],
  stage: ['stage', 'status', 'pipeline stage'],
  owners: ['owners', 'owner', 'deal owner', 'deal owners', 'assignee'],
  deal_originator: ['deal_originator', 'originator', 'introducer', 'source person'],
  value: ['value', 'amount', 'deal amount', 'deal value', 'revenue', 'price'],
  source: ['source', 'lead source', 'channel'],
  expected_close_date: ['expected_close_date', 'close date', 'expected close', 'close'],
  won_date: ['won_date', 'won', 'date won', 'closed won date'],
  lost_reason: ['lost_reason', 'reason lost', 'loss reason'],
  notes: ['notes', 'comments', 'description'],
  forecast_category: ['forecast_category', 'forecast', 'category'],
};

const STAGE_MAP: Record<string, DealStage> = {
  'lead': 'Lead',
  'qualified': 'Qualified',
  'qualified lead': 'Qualified',
  'discovery': 'Discovery',
  'proposal': 'Proposal',
  'commercials': 'Commercials / Procurement',
  'commercials / procurement': 'Commercials / Procurement',
  'procurement': 'Commercials / Procurement',
  'verbal commit': 'Verbal Commit',
  'won': 'Closed Won',
  'closed won': 'Closed Won',
  'lost': 'Closed Lost',
  'closed lost': 'Closed Lost',
};

const STAGE_BADGE: Record<string, string> = {
  'Lead': 'bg-muted text-muted-foreground',
  'Qualified': 'bg-primary/15 text-primary',
  'Discovery': 'bg-primary/15 text-primary',
  'Proposal': 'bg-amber-500/15 text-amber-600',
  'Commercials / Procurement': 'bg-amber-500/15 text-amber-600',
  'Verbal Commit': 'bg-amber-500/15 text-amber-600',
  'Closed Won': 'bg-health-green/15 text-health-green',
  'Closed Lost': 'bg-destructive/15 text-destructive',
};

const SECTION_LABELS = ['leads', 'active deals', 'closed won', 'closed lost', 'learn how to use', 'deals', 'try it free'];
const DATE_RANGE_RE = /^\d{4}-\d{2}-\d{2}\s+to\s+\d{4}-\d{2}-\d{2}$/i;

function isJunkFirstCell(firstCell: string): boolean {
  if (!firstCell) return true;
  const lc = firstCell.toLowerCase().trim();
  if (SECTION_LABELS.some(l => lc.startsWith(l))) return true;
  if (firstCell.includes('http')) return true;
  if (DATE_RANGE_RE.test(firstCell.trim())) return true;
  return false;
}



// ---------- CSV parser (handles quoted commas and escaped quotes) ----------
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { cur.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        cur.push(field); field = '';
        if (cur.some(v => v.length > 0)) rows.push(cur);
        cur = [];
      } else field += c;
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  return rows;
}

function parseDate(s: string): string | null {
  if (!s) return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  // ISO date
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  // DD/MM/YYYY or MM/DD/YYYY — assume DD/MM/YYYY (UK)
  const m = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const year = y.length === 2 ? '20' + y : y;
    return `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function parseNumber(s: string): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[£$€,\s]/g, '');
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

interface ParsedRow {
  rowIndex: number;
  deal_name: string;
  company_name: string;
  stage: DealStage | null;
  stage_raw: string;
  owners: string[];
  deal_originator: string | null;
  value: number | null;
  source: string | null;
  expected_close_date: string | null;
  won_date: string | null;
  lost_reason: string | null;
  notes: string | null;
  forecast_category: ForecastCategory | null;
  warnings: string[];
}

const TEMPLATE_COLUMNS = ['deal_name', 'company_name', 'stage', 'owners', 'deal_originator', 'value', 'source', 'expected_close_date', 'won_date', 'lost_reason', 'notes', 'forecast_category'];

const ImportPage = () => {
  const navigate = useNavigate();
  const { companies, refresh } = useCrm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [headerMap, setHeaderMap] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const mappedKeys = useMemo(() => Object.values(headerMap).filter(Boolean), [headerMap]);

  const parseRows = useCallback((grid: string[][]) => {
    if (grid.length < 2) { toast.error('File is empty or missing rows'); return; }

    // Find header row: scan first 10 rows for one containing recognizable column names
    const HEADER_HINTS = ['deal name', 'deal_name', 'name', 'stage', 'owner', 'company', 'value', 'amount'];
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(grid.length, 10); i++) {
      const row = grid[i].map(c => String(c).toLowerCase().trim());
      if (row.some(c => HEADER_HINTS.includes(c))) { headerRowIdx = i; break; }
    }

    const headers = grid[headerRowIdx].map(h => String(h).trim());
    const lowerHeaders = headers.map(h => h.toLowerCase());

    // Auto-detect column mapping
    const map: Record<string, string> = {};
    for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
      for (const alias of aliases) {
        const idx = lowerHeaders.indexOf(alias);
        if (idx >= 0) { map[key] = headers[idx]; break; }
      }
    }
    setHeaderMap(map);

    const idx = (key: string) => {
      const h = map[key];
      return h ? headers.indexOf(h) : -1;
    };

    const dealNameIdx = idx('deal_name');
    const companyIdx = idx('company_name');
    const stageIdx = idx('stage');
    const ownersIdx = idx('owners');
    const originatorIdx = idx('deal_originator');
    const valueIdx = idx('value');
    const sourceIdx = idx('source');
    const ecdIdx = idx('expected_close_date');
    const wonIdx = idx('won_date');
    const lostIdx = idx('lost_reason');
    const notesIdx = idx('notes');
    const fcIdx = idx('forecast_category');

    const parsedRows: ParsedRow[] = [];
    for (let r = headerRowIdx + 1; r < grid.length; r++) {
      const row = grid[r];
      const get = (i: number) => (i >= 0 && i < row.length ? String(row[i] ?? '').trim() : '');
      const warnings: string[] = [];

      const deal_name = get(dealNameIdx);
      if (!deal_name) continue; // skip blank rows

      const company_name = get(companyIdx);
      if (!company_name) warnings.push('Missing company');

      const stage_raw = get(stageIdx);
      const stageKey = stage_raw.toLowerCase().trim();
      const stage = STAGE_MAP[stageKey] ?? null;
      if (stage_raw && !stage) warnings.push(`Unknown stage "${stage_raw}"`);

      const ownersRaw = get(ownersIdx);
      const owners = ownersRaw
        ? ownersRaw.split(/[,;]/).map(o => o.trim()).filter(Boolean)
        : [];

      const valueRaw = get(valueIdx);
      const value = parseNumber(valueRaw);
      if (valueRaw && value === null) warnings.push(`Invalid value "${valueRaw}"`);

      const ecdRaw = get(ecdIdx);
      const expected_close_date = parseDate(ecdRaw);
      if (ecdRaw && !expected_close_date) warnings.push(`Invalid close date "${ecdRaw}"`);

      const wonRaw = get(wonIdx);
      const won_date = parseDate(wonRaw);
      if (wonRaw && !won_date) warnings.push(`Invalid won date "${wonRaw}"`);

      const fcRaw = get(fcIdx);
      const fc = fcRaw as ForecastCategory;
      const validFc: ForecastCategory[] = ['Pipeline', 'Best Case', 'Commit', 'Closed Won', 'Closed Lost'];
      const forecast_category = validFc.includes(fc) ? fc : null;

      parsedRows.push({
        rowIndex: r,
        deal_name,
        company_name,
        stage,
        stage_raw,
        owners,
        deal_originator: get(originatorIdx) || null,
        value,
        source: get(sourceIdx) || null,
        expected_close_date,
        won_date,
        lost_reason: get(lostIdx) || null,
        notes: get(notesIdx) || null,
        forecast_category,
        warnings,
      });
    }

    setRows(parsedRows);
    toast.success(`Parsed ${parsedRows.length} rows`);
  }, []);

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    setResult(null);
    const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
    const reader = new FileReader();
    if (isExcel) {
      reader.onload = e => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        let allRows: string[][] = [];
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
          const stringRows = rows.map(r => r.map(c => String(c ?? '')));
          if (stringRows.some(r => r.some(c => {
            const lc = c.toLowerCase().trim();
            return lc === 'name' || lc === 'deal_name' || lc === 'deal name';
          }))) {
            allRows = stringRows;
            break;
          }
        }
        if (!allRows.length) {
          for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
            allRows.push(...rows.map(r => r.map(c => String(c ?? ''))));
          }
        }
        parseRows(allRows);
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = e => {
        const text = e.target?.result as string;
        parseRows(parseCSV(text));
      };
      reader.readAsText(file);
    }
  }, [parseRows]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const downloadTemplate = () => {
    const sample = [
      TEMPLATE_COLUMNS.join(','),
      'Example Deal,Acme Ltd,Proposal,"Pippa Bradley-Dixon, Craig Davies",Adam Solomons,50000,Referral,2026-09-30,,,Initial discovery complete,Best Case',
      'Won Deal Example,Beta Corp,Closed Won,Pippa Bradley-Dixon,,25000,Inbound,,2026-01-14,,,Closed Won',
    ].join('\n');
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deal-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    setResult(null);
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    // Build company cache (lowercase name -> id)
    const companyCache = new Map<string, string>();
    for (const c of companies) companyCache.set(c.company_name.toLowerCase(), c.id);

    for (const row of rows) {
      try {
        // Resolve / create company
        let companyId: string | null = null;
        if (row.company_name) {
          const key = row.company_name.toLowerCase();
          if (companyCache.has(key)) {
            companyId = companyCache.get(key)!;
          } else {
            const { data: newCo, error: coErr } = await supabase
              .from('companies')
              .insert({ company_name: row.company_name, status: 'prospect' })
              .select('id')
              .single();
            if (coErr) throw new Error(`Company create failed: ${coErr.message}`);
            companyId = newCo.id;
            companyCache.set(key, companyId);
          }
        }

        const stage = row.stage ?? 'Lead';
        const status = stage === 'Closed Won' ? 'closed_won' : stage === 'Closed Lost' ? 'closed_lost' : 'open';
        const confidence = stage === 'Closed Won' ? 100 : stage === 'Closed Lost' ? 0 : 20;

        const dealPayload: any = {
          deal_name: row.deal_name,
          company_id: companyId,
          stage,
          status,
          confidence_percent: confidence,
          value: row.value ?? 0,
          owner: row.owners[0] ?? null,
          deal_originator: row.deal_originator,
          source: row.source,
          expected_close_date: row.expected_close_date,
          won_date: row.won_date,
          lost_reason: row.lost_reason,
          notes: row.notes,
          forecast_category: row.forecast_category ?? (stage === 'Closed Won' ? 'Closed Won' : stage === 'Closed Lost' ? 'Closed Lost' : 'Pipeline'),
        };

        const { data: newDeal, error: dealErr } = await supabase
          .from('deals')
          .insert(dealPayload)
          .select('id')
          .single();
        if (dealErr) throw new Error(`Deal insert failed: ${dealErr.message}`);

        // deal_owners with equal split, first is primary
        if (row.owners.length > 0 && newDeal) {
          const pct = Math.floor(100 / row.owners.length);
          const remainder = 100 - pct * row.owners.length;
          const ownerRecords = row.owners.map((name, i) => ({
            deal_id: newDeal.id,
            user_name: name,
            ownership_percent: i === 0 ? pct + remainder : pct,
            role: i === 0 ? 'primary' : 'secondary',
          }));
          const { error: ownErr } = await supabase.from('deal_owners').insert(ownerRecords);
          if (ownErr) errors.push(`Row ${row.rowIndex} owners: ${ownErr.message}`);
        }

        success++;
      } catch (err: any) {
        failed++;
        errors.push(`Row ${row.rowIndex} (${row.deal_name}): ${err.message}`);
      }
    }

    setImporting(false);
    setResult({ success, failed, errors });
    if (success > 0) {
      toast.success(`Imported ${success} deals`);
      await refresh();
    }
    if (failed > 0) toast.error(`${failed} rows failed`);
  };

  const reset = () => {
    setFileName(null);
    setRows([]);
    setHeaderMap({});
    setResult(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Import Deals</h1>
          <p className="text-sm text-muted-foreground">Bulk import deals from a CSV (e.g. Monday.com export). Stage gate validation is bypassed — fill in missing data after import.</p>
        </div>
        <Button variant="outline" onClick={downloadTemplate} className="flex items-center gap-1.5">
          <Download size={16} /> Download CSV template
        </Button>
      </div>

      {!fileName && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`bg-card border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
        >
          <Upload size={36} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Drop a CSV or Excel file here, or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">Monday.com exports and standard Excel files are supported</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      )}

      {fileName && (
        <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">{fileName}</p>
              <p className="text-xs text-muted-foreground">{rows.length} deals · {mappedKeys.length} columns mapped</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={reset}>Choose different file</Button>
            <Button onClick={handleImport} disabled={importing || rows.length === 0}>
              {importing ? <><Loader2 size={16} className="animate-spin mr-1.5" /> Importing…</> : `Import ${rows.length} deals`}
            </Button>
          </div>
        </div>
      )}

      {Object.keys(headerMap).length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Detected column mapping</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(headerMap).map(([k, v]) => (
              <span key={k} className="text-xs px-2 py-1 rounded-md bg-accent text-accent-foreground">
                <span className="text-muted-foreground">{v}</span> → <span className="font-medium">{k}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-accent/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Deal</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Company</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Stage</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Owners</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Value</th>
                  <th className="text-center px-4 py-2 text-xs font-medium text-muted-foreground">⚠</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.rowIndex} className="border-b border-border last:border-0 hover:bg-accent/30">
                    <td className="px-4 py-2 text-foreground">{r.deal_name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.company_name || <span className="italic">—</span>}</td>
                    <td className="px-4 py-2">
                      {r.stage ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STAGE_BADGE[r.stage]}`}>{r.stage}</span>
                      ) : (
                        <span className="text-xs text-destructive">{r.stage_raw || 'Lead'}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">
                      {r.owners.length > 0 ? r.owners.map((o, i) => (
                        <span key={i}>{i > 0 && ', '}<span className={i === 0 ? 'font-medium text-foreground' : ''}>{o}</span></span>
                      )) : <span className="italic">—</span>}
                    </td>
                    <td className="px-4 py-2 text-right text-foreground">{r.value !== null ? formatGBP(r.value) : <span className="italic text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-2 text-center">
                      {r.warnings.length > 0 && (
                        <span title={r.warnings.join('\n')}>
                          <AlertTriangle size={16} className="text-amber-500 inline" />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={18} className="text-health-green" />
              <span className="text-sm font-medium text-foreground">{result.success} imported</span>
            </div>
            {result.failed > 0 && (
              <div className="flex items-center gap-1.5">
                <XCircle size={18} className="text-destructive" />
                <span className="text-sm font-medium text-foreground">{result.failed} failed</span>
              </div>
            )}
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => navigate('/deals')}>View deals →</Button>
          </div>
          {result.errors.length > 0 && (
            <div className="text-xs text-muted-foreground mt-2 space-y-1 max-h-40 overflow-y-auto">
              {result.errors.map((e, i) => <div key={i} className="text-destructive">{e}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImportPage;
