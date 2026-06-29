import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatGBP } from '@/lib/currency';
import { useState, useMemo } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface DrillDownRow {
  dealId: string;
  dealName: string;
  lineItemName: string;
  billingMonth: string;
  revenue: number;
  cost: number;
  marginValue: number;
  marginPercent: number;
  owner: string;
  originator?: string;
  collaborators?: string;
  stage?: string;
  createdDate?: string;
  company?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  rows: DrillDownRow[];
  variant?: 'financial' | 'leads';
  dateColumnLabel?: string;
}

type FinancialSortKey = 'dealName' | 'lineItemName' | 'billingMonth' | 'revenue' | 'cost' | 'marginValue' | 'marginPercent';
type LeadsSortKey = 'dealName' | 'company' | 'stage' | 'originator' | 'collaborators' | 'createdDate';
type SortKey = FinancialSortKey | LeadsSortKey;

export default function DrillDownPanel({ open, onOpenChange, title, rows, variant = 'financial' }: Props) {
  const navigate = useNavigate();
  const isLeads = variant === 'leads';
  const [sortKey, setSortKey] = useState<SortKey>(isLeads ? 'createdDate' : 'revenue');
  const [sortAsc, setSortAsc] = useState(false);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(key === 'dealName' || key === 'lineItemName' || key === 'company' || key === 'stage' || key === 'originator' || key === 'collaborators');
    }
  };

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = (a as any)[sortKey] ?? '';
      const bv = (b as any)[sortKey] ?? '';
      const cmp = typeof av === 'string' ? (av as string).localeCompare(bv as string) : (av as number) - (bv as number);
      return sortAsc ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortAsc]);

  const totals = useMemo(() => ({
    revenue: rows.reduce((s, r) => s + r.revenue, 0),
    cost: rows.reduce((s, r) => s + r.cost, 0),
    marginValue: rows.reduce((s, r) => s + r.marginValue, 0),
  }), [rows]);
  const totalMarginPct = totals.revenue > 0 ? Math.round((totals.marginValue / totals.revenue) * 100) : 0;

  const getMarginColor = (pct: number) =>
    pct >= 20 ? 'text-health-green' : pct >= 0 ? 'text-health-amber' : 'text-health-red';

  const SortHeader = ({ label, field, align }: { label: string; field: SortKey; align?: string }) => (
    <TableHead className={`cursor-pointer select-none hover:text-foreground ${align === 'right' ? 'text-right' : ''}`} onClick={() => toggleSort(field)}>
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown size={12} className={sortKey === field ? 'text-foreground' : 'text-muted-foreground/40'} />
      </span>
    </TableHead>
  );

  // Group leads by originator
  const originatorGroups = useMemo(() => {
    if (!isLeads) return [];
    const map = new Map<string, DrillDownRow[]>();
    rows.forEach(r => {
      const key = (r.originator && r.originator.trim()) ? r.originator.trim() : 'Not set';
      const arr = map.get(key) || [];
      arr.push(r);
      map.set(key, arr);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [rows, isLeads]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">{title}</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {rows.length} {isLeads ? 'lead' : 'line item'}{rows.length !== 1 ? 's' : ''}
            {!isLeads && ` · Total ${formatGBP(totals.revenue)}`}
          </p>
        </SheetHeader>

        {isLeads && originatorGroups.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">By Originator</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {originatorGroups.map(([orig, list]) => (
                <div key={orig} className="bg-card rounded-md border border-border p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-sm text-card-foreground">{orig}</span>
                    <span className="text-xs text-muted-foreground">{list.length} deal{list.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-0.5">
                    {list.map(r => (
                      <button
                        key={r.dealId}
                        onClick={() => { onOpenChange(false); navigate(`/deals/${r.dealId}`); }}
                        className="block w-full text-left text-xs text-muted-foreground hover:text-foreground hover:underline truncate"
                      >
                        {r.dealName}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader label="Deal" field="dealName" />
                {isLeads ? (
                  <>
                    <SortHeader label="Company" field="company" />
                    <SortHeader label="Stage" field="stage" />
                    <SortHeader label="Originator" field="originator" />
                    <SortHeader label="Owner / Collaborators" field="collaborators" />
                    <SortHeader label="Created" field="createdDate" />
                  </>
                ) : (
                  <>
                    <SortHeader label="Line Item" field="lineItemName" />
                    <SortHeader label="Month" field="billingMonth" />
                    <SortHeader label="Revenue" field="revenue" align="right" />
                    <SortHeader label="Cost" field="cost" align="right" />
                    <SortHeader label="Margin £" field="marginValue" align="right" />
                    <SortHeader label="Margin %" field="marginPercent" align="right" />
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row, i) => (
                <TableRow
                  key={`${row.dealId}-${row.lineItemName}-${i}`}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => { onOpenChange(false); navigate(`/deals/${row.dealId}`); }}
                >
                  <TableCell className="font-medium text-card-foreground max-w-[160px] truncate">{row.dealName}</TableCell>
                  {isLeads ? (
                    <>
                      <TableCell className="text-muted-foreground text-xs">{row.company || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{row.stage || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{row.originator || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{row.collaborators || row.owner || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{row.createdDate || '—'}</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-muted-foreground text-xs">{row.lineItemName}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{row.billingMonth || '—'}</TableCell>
                      <TableCell className="text-right">{formatGBP(row.revenue)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatGBP(row.cost)}</TableCell>
                      <TableCell className={`text-right ${getMarginColor(row.marginPercent)}`}>{formatGBP(row.marginValue)}</TableCell>
                      <TableCell className={`text-right ${getMarginColor(row.marginPercent)}`}>{Math.round(row.marginPercent)}%</TableCell>
                    </>
                  )}
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={isLeads ? 6 : 7} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          {!isLeads && rows.length > 0 && (
            <div className="flex justify-end gap-6 px-4 py-3 border-t border-border text-sm font-semibold">
              <span>Total: {formatGBP(totals.revenue)}</span>
              <span className={getMarginColor(totalMarginPct)}>Margin: {formatGBP(totals.marginValue)} ({totalMarginPct}%)</span>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
