import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  format, isAfter, isBefore, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter,
  startOfYear, endOfYear, subMonths, subQuarters,
} from 'date-fns';
import { PoundSterling, Percent, CheckCircle2, Target, TrendingUp, BarChart3 } from 'lucide-react';
import { useFilteredCrm } from '@/hooks/useFilteredCrm';
import { supabase } from '@/integrations/supabase/client';
import { formatGBP } from '@/lib/currency';
import { safeParseDate } from '@/lib/dateUtils';
import DrillDownPanel, { type DrillDownRow } from '@/components/DrillDownPanel';

const PRESETS = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'this_quarter', label: 'This Quarter' },
  { key: 'last_quarter', label: 'Last Quarter' },
  { key: 'this_year', label: 'This Year' },
  { key: 'custom', label: 'Custom' },
];

const FUNNEL_STAGES = [
  'Lead', 'Qualified', 'Discovery', 'Proposal', 'Commercials / Procurement', 'Verbal Commit', 'Closed Won',
];

const LIVE_STAGES = ['Qualified', 'Proposal', 'Commercials / Procurement', 'Verbal Commit'];

const isInRange = (date: Date, start: Date, end: Date) =>
  (isAfter(date, start) || date.getTime() === start.getTime()) &&
  (isBefore(date, end) || date.getTime() === end.getTime());

const StatCard = ({ label, value, sub, icon: Icon, variant = 'default', onClick }: { label: string; value: string; sub?: string; icon: any; variant?: string; onClick?: () => void }) => (
  <div
    className={`bg-card rounded-lg border border-border p-4 ${onClick ? 'cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Icon size={18} className={variant === 'green' ? 'text-health-green' : variant === 'amber' ? 'text-health-amber' : variant === 'red' ? 'text-health-red' : 'text-primary'} />
    </div>
    <p className="text-xl font-bold text-card-foreground">{value}</p>
    {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
  </div>
);

export default function ReportsPage() {
  const { deals, getCompany, loading } = useFilteredCrm();
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [stageHistory, setStageHistory] = useState<any[]>([]);
  const [preset, setPreset] = useState<string>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [drillDown, setDrillDown] = useState<{ open: boolean; title: string; rows: DrillDownRow[]; variant: 'financial' | 'leads'; dateColumnLabel?: string }>({ open: false, title: '', rows: [], variant: 'financial' });

  useEffect(() => {
    supabase.from('deal_line_items').select('*').eq('is_deleted', false).then(({ data }) => { if (data) setLineItems(data); });
    supabase.from('stage_history').select('*').then(({ data }) => { if (data) setStageHistory(data); });
  }, []);

  const { rangeStart, rangeEnd } = useMemo(() => {
    const now = new Date();
    switch (preset) {
      case 'this_month': return { rangeStart: startOfMonth(now), rangeEnd: endOfMonth(now) };
      case 'last_month': return { rangeStart: startOfMonth(subMonths(now, 1)), rangeEnd: endOfMonth(subMonths(now, 1)) };
      case 'this_quarter': return { rangeStart: startOfQuarter(now), rangeEnd: endOfQuarter(now) };
      case 'last_quarter': return { rangeStart: startOfQuarter(subQuarters(now, 1)), rangeEnd: endOfQuarter(subQuarters(now, 1)) };
      case 'this_year': return { rangeStart: startOfYear(now), rangeEnd: endOfYear(now) };
      case 'custom': return {
        rangeStart: customFrom ? new Date(customFrom) : startOfMonth(now),
        rangeEnd: customTo ? new Date(`${customTo}T23:59:59`) : endOfMonth(now),
      };
      default: return { rangeStart: startOfMonth(now), rangeEnd: endOfMonth(now) };
    }
  }, [preset, customFrom, customTo]);

  const dealLineItemsMap = useMemo(() => {
    const map = new Map<string, any[]>();
    lineItems.forEach(li => {
      const arr = map.get(li.deal_id) || [];
      arr.push(li);
      map.set(li.deal_id, arr);
    });
    return map;
  }, [lineItems]);

  const openDrillDown = useCallback((title: string, rows: DrillDownRow[], variant: 'financial' | 'leads' = 'financial', dateColumnLabel?: string) => {
    setDrillDown({ open: true, title, rows, variant, dateColumnLabel });
  }, []);

  const closedWonDeals = useMemo(() => deals.filter(d => d.status === 'closed_won'), [deals]);
  const openDeals = useMemo(() => deals.filter(d => d.status === 'open'), [deals]);

  // ==== Revenue & margin in range (by won_date / line item billing month) ====
  const actuals = useMemo(() => {
    let revenue = 0, margin = 0;
    const wonIds = new Set<string>();
    const rows: DrillDownRow[] = [];
    closedWonDeals.forEach(d => {
      const items = dealLineItemsMap.get(d.id);
      if (items && items.length > 0) {
        items.forEach((li: any) => {
          const billingDate = safeParseDate(li.billing_month) ?? safeParseDate(d.won_date);
          if (billingDate && isInRange(billingDate, rangeStart, rangeEnd)) {
            const rev = Number(li.revenue_value) * d.splitFraction;
            const cost = Number(li.estimated_delivery_cost ?? 0) * d.splitFraction;
            revenue += rev; margin += rev - cost; wonIds.add(d.id);
            rows.push({
              dealId: d.id, dealName: d.deal_name, lineItemName: li.name || 'Line Item',
              billingMonth: li.billing_month ? format(new Date(li.billing_month), 'MMM yyyy') : '',
              revenue: rev, cost, marginValue: rev - cost,
              marginPercent: rev > 0 ? ((rev - cost) / rev) * 100 : 0, owner: d.owner || '',
            });
          }
        });
      } else {
        const p = safeParseDate(d.won_date);
        if (p && isInRange(p, rangeStart, rangeEnd)) {
          revenue += d.splitValue; margin += d.splitMarginValue; wonIds.add(d.id);
          rows.push({
            dealId: d.id, dealName: d.deal_name, lineItemName: 'Deal Total',
            billingMonth: format(p, 'MMM yyyy'),
            revenue: d.splitValue, cost: (d.estimated_delivery_cost || 0) * d.splitFraction,
            marginValue: d.splitMarginValue, marginPercent: d.gross_margin_percent || 0, owner: d.owner || '',
          });
        }
      }
    });
    return { revenue, margin, rows, dealsWon: wonIds.size };
  }, [closedWonDeals, dealLineItemsMap, rangeStart, rangeEnd]);

  const marginPct = actuals.revenue > 0 ? Math.round((actuals.margin / actuals.revenue) * 100) : 0;

  // ==== Funnel from stage_history ====
  const dealById = useMemo(() => new Map(deals.map(d => [d.id, d])), [deals]);

  const leadRow = useCallback((d: any, dateLabel?: string): DrillDownRow => ({
    dealId: d.id,
    dealName: d.deal_name,
    lineItemName: d.stage,
    billingMonth: '',
    revenue: d.splitValue,
    cost: (d.estimated_delivery_cost || 0) * d.splitFraction,
    marginValue: d.splitMarginValue,
    marginPercent: d.gross_margin_percent || 0,
    owner: d.owner || '',
    originator: (d as any).deal_originator || 'Not set',
    collaborators: d.owner || '',
    stage: d.status === 'closed_won' ? 'Closed Won' : d.status === 'closed_lost' ? 'Closed Lost' : d.stage,
    company: getCompany(d.company_id)?.company_name || '—',
    createdDate: dateLabel || (d.lead_date ? format(new Date(d.lead_date), 'dd MMM yyyy') : ''),
  }), [getCompany]);

  const funnel = useMemo(() => {
    return FUNNEL_STAGES.map(stage => {
      const entries = stageHistory.filter(h => h.to_stage === stage && isInRange(new Date(h.transitioned_at), rangeStart, rangeEnd));
      const seen = new Set<string>();
      const stageDeals: any[] = [];
      entries.forEach(h => {
        if (seen.has(h.deal_id)) return;
        const d = dealById.get(h.deal_id);
        if (!d) return;
        seen.add(h.deal_id);
        stageDeals.push({ deal: d, at: h.transitioned_at });
      });
      return {
        stage,
        count: stageDeals.length,
        value: stageDeals.reduce((s, x) => s + x.deal.splitValue, 0),
        rows: stageDeals.map(x => leadRow(x.deal, format(new Date(x.at), 'dd MMM yyyy'))),
      };
    });
  }, [stageHistory, rangeStart, rangeEnd, dealById, leadRow]);

  const funnelMax = Math.max(1, ...funnel.map(f => f.count));

  // ==== Leads in period + originator breakdown ====
  const leadsInPeriod = useMemo(() => {
    const ids = new Set(
      stageHistory
        .filter(h => h.to_stage === 'Lead' && isInRange(new Date(h.transitioned_at), rangeStart, rangeEnd))
        .map(h => h.deal_id)
    );
    return deals.filter(d => ids.has(d.id));
  }, [stageHistory, rangeStart, rangeEnd, deals]);

  const originatorRows = useMemo(() => {
    const acc: Record<string, any[]> = {};
    leadsInPeriod.forEach(d => {
      const key = ((d as any).deal_originator || '').trim() || 'Not set';
      (acc[key] = acc[key] || []).push(d);
    });
    return Object.entries(acc)
      .map(([originator, list]) => ({
        originator,
        leads: list,
        progressed: list.filter(d => d.stage !== 'Lead').length,
        won: list.filter(d => d.status === 'closed_won').length,
        value: list.reduce((s, d) => s + d.splitValue, 0),
      }))
      .sort((a, b) => b.leads.length - a.leads.length);
  }, [leadsInPeriod]);

  // ==== Pipeline snapshot (live, not date-filtered) ====
  const openRows = (subset: any[]): DrillDownRow[] => subset.map(d => ({
    dealId: d.id,
    dealName: d.deal_name,
    lineItemName: d.forecast_category,
    billingMonth: d.expected_close_date ? format(new Date(d.expected_close_date), 'MMM yyyy') : '',
    revenue: d.splitValue,
    cost: (d.estimated_delivery_cost || 0) * d.splitFraction,
    marginValue: d.splitMarginValue,
    marginPercent: d.gross_margin_percent || 0,
    owner: d.owner || '',
  }));

  const openWithValue = openDeals.filter(d => (d.value || 0) > 0);
  const totalOpen = openWithValue.reduce((s, d) => s + d.splitValue, 0);
  const weighted = openWithValue.reduce((s, d) => s + d.splitWeightedValue, 0);
  const byCategory = ['Commit', 'Best Case', 'Pipeline'].map(cat => {
    const subset = openWithValue.filter(d => d.forecast_category === cat);
    return { cat, subset, value: subset.reduce((s, d) => s + d.splitValue, 0) };
  });
  const liveStages = LIVE_STAGES.map(stage => {
    const subset = openDeals.filter(d => d.stage === stage);
    return { stage, subset, value: subset.reduce((s, d) => s + d.splitValue, 0) };
  });

  if (loading) return <div className="p-6"><p className="text-muted-foreground">Loading…</p></div>;

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><BarChart3 size={22} className="text-primary" /> Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {format(rangeStart, 'dd MMM yyyy')} – {format(rangeEnd, 'dd MMM yyyy')}
        </p>
      </div>

      {/* Date range selector */}
      <div className="bg-card rounded-lg border border-border p-4 flex flex-wrap items-center gap-2">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
              preset === p.key ? 'bg-primary text-primary-foreground border-primary' : 'border-input bg-background text-foreground hover:bg-accent'
            }`}
          >
            {p.label}
          </button>
        ))}
        {preset === 'custom' && (
          <div className="flex items-center gap-2 ml-2">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="px-2 py-1.5 rounded-md border border-input bg-background text-sm" />
            <span className="text-muted-foreground text-sm">to</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="px-2 py-1.5 rounded-md border border-input bg-background text-sm" />
          </div>
        )}
      </div>

      {/* Revenue & Margin */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Revenue &amp; Margin — Selected Period</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Closed Won Revenue" value={formatGBP(actuals.revenue)} icon={PoundSterling} variant="green"
            onClick={() => openDrillDown('Closed Won Revenue', actuals.rows)} />
          <StatCard label="Closed Won Margin" value={formatGBP(actuals.margin)} icon={Percent} variant={marginPct >= 20 ? 'green' : 'amber'}
            onClick={() => openDrillDown('Closed Won Margin', actuals.rows)} />
          <StatCard label="Margin %" value={`${marginPct}%`} icon={Percent} variant={marginPct >= 20 ? 'green' : 'amber'} />
          <StatCard label="Deals Won" value={String(actuals.dealsWon)} icon={CheckCircle2} variant="green"
            onClick={() => openDrillDown('Deals Won', actuals.rows)} />
        </div>
      </section>

      {/* Funnel */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Funnel — Deals Entering Each Stage</h2>
        <div className="bg-card rounded-lg border border-border divide-y divide-border">
          {funnel.map(f => (
            <button
              key={f.stage}
              onClick={() => openDrillDown(`${f.stage} — entered in period`, f.rows, 'leads', 'Entered')}
              className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
            >
              <span className="w-56 text-sm font-medium text-card-foreground shrink-0">{f.stage}</span>
              <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${(f.count / funnelMax) * 100}%` }} />
              </div>
              <span className="w-20 text-right text-sm font-semibold text-card-foreground">{f.count}</span>
              <span className="w-28 text-right text-sm text-muted-foreground">{formatGBP(f.value)}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Pipeline snapshot */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pipeline Snapshot — Right Now</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="Total Open Pipeline" value={formatGBP(totalOpen)} sub={`${openWithValue.length} deals`} icon={TrendingUp}
            onClick={() => openDrillDown('Total Open Pipeline', openRows(openWithValue))} />
          <StatCard label="Weighted Pipeline" value={formatGBP(weighted)} icon={Target}
            onClick={() => openDrillDown('Weighted Pipeline', openRows(openWithValue))} />
          {byCategory.map(c => (
            <StatCard key={c.cat} label={c.cat} value={formatGBP(c.value)} sub={`${c.subset.length} deals`} icon={Target}
              onClick={() => openDrillDown(`${c.cat} Pipeline`, openRows(c.subset))} />
          ))}
        </div>
      </section>

      {/* Live stage cards */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Live Pipeline — Active Stages</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {liveStages.map(s => (
            <StatCard key={s.stage} label={`${s.stage} — Live`} value={formatGBP(s.value)} sub={`${s.subset.length} deals`} icon={Target}
              onClick={() => openDrillDown(`${s.stage} — live deals`, openRows(s.subset))} />
          ))}
        </div>
      </section>

      {/* Originator breakdown */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Originator Breakdown — Leads in Period</h2>
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-2 font-medium">Originator</th>
                <th className="px-4 py-2 font-medium text-right">Leads</th>
                <th className="px-4 py-2 font-medium text-right">Progressed</th>
                <th className="px-4 py-2 font-medium text-right">Won</th>
                <th className="px-4 py-2 font-medium text-right">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {originatorRows.map(r => (
                <tr
                  key={r.originator}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => openDrillDown(`Leads — ${r.originator}`, r.leads.map(d => leadRow(d)), 'leads', 'Lead Date')}
                >
                  <td className="px-4 py-2.5 font-medium text-card-foreground">{r.originator}</td>
                  <td className="px-4 py-2.5 text-right">{r.leads.length}</td>
                  <td className="px-4 py-2.5 text-right">{r.progressed}</td>
                  <td className="px-4 py-2.5 text-right text-health-green">{r.won}</td>
                  <td className="px-4 py-2.5 text-right">{formatGBP(r.value)}</td>
                </tr>
              ))}
              {originatorRows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No leads in this period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <DrillDownPanel
        open={drillDown.open}
        onOpenChange={o => setDrillDown(s => ({ ...s, open: o }))}
        title={drillDown.title}
        rows={drillDown.rows}
        variant={drillDown.variant}
        dateColumnLabel={drillDown.dateColumnLabel}
      />
    </div>
  );
}
