import { useFilteredCrm } from '@/hooks/useFilteredCrm';
import { useUserView } from '@/context/UserViewContext';
import { useAllActivities } from '@/hooks/useActivities';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, isAfter, isBefore, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfWeek, endOfWeek, subDays } from 'date-fns';
import { TrendingUp, AlertTriangle, PoundSterling, Target, CheckCircle2, XCircle, Clock, CalendarDays, Users, TriangleAlert, BarChart3, Percent } from 'lucide-react';
import OutstandingActions from '@/components/OutstandingActions';
import { formatGBP } from '@/lib/currency';
import { safeParseDate } from '@/lib/dateUtils';
import { supabase } from '@/integrations/supabase/client';
import DrillDownPanel, { type DrillDownRow } from '@/components/DrillDownPanel';

const KpiCard = ({ label, value, icon: Icon, variant = 'default', sub, onClick }: { label: string; value: string; icon: any; variant?: string; sub?: string; onClick?: () => void }) => (
  <div
    className={`bg-card rounded-lg border border-border p-5 ${onClick ? 'cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <Icon size={18} className={variant === 'green' ? 'text-health-green' : variant === 'red' ? 'text-health-red' : variant === 'amber' ? 'text-health-amber' : 'text-primary'} />
    </div>
    <p className="text-2xl font-bold text-card-foreground">{value}</p>
    {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    {onClick && <p className="text-[10px] text-primary/60 mt-1">Click to drill down</p>}
  </div>
);

const DashboardPage = () => {
  const { deals, getCompany, getDealHealth, loading } = useFilteredCrm();
  const { selectedView } = useUserView();
  const { activities } = useAllActivities();
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [drillDown, setDrillDown] = useState<{ open: boolean; title: string; rows: DrillDownRow[]; variant?: 'financial' | 'leads'; dateColumnLabel?: string }>({ open: false, title: '', rows: [], variant: 'financial' });

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const thisQStart = startOfQuarter(now);
  const thisQEnd = endOfQuarter(now);
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });

  useEffect(() => {
    supabase.from('deal_line_items').select('*').eq('is_deleted', false).then(({ data, error }) => {
      if (error) console.error('Failed to fetch line items:', error);
      if (data) setLineItems(data);
    });
  }, [deals]);

  const openDrillDown = useCallback((title: string, rows: DrillDownRow[], variant: 'financial' | 'leads' = 'financial', dateColumnLabel?: string) => {
    setDrillDown({ open: true, title, rows, variant, dateColumnLabel });
  }, []);

  if (loading) return <div className="p-6"><p className="text-muted-foreground">Loading…</p></div>;

  // Build line items map
  const dealLineItemsMap = new Map<string, any[]>();
  lineItems.forEach(li => {
    const arr = dealLineItemsMap.get(li.deal_id) || [];
    arr.push(li);
    dealLineItemsMap.set(li.deal_id, arr);
  });

  // === Helper: build drill-down rows for closed-won deals in a range ===
  const buildActualRows = (start: Date, end: Date): DrillDownRow[] => {
    const rows: DrillDownRow[] = [];
    closedWonDeals.forEach(d => {
      const items = dealLineItemsMap.get(d.id);
      if (items && items.length > 0) {
        items.forEach((li: any) => {
          const billingDate = safeParseDate(li.billing_month) ?? safeParseDate(d.won_date);
          if (billingDate && isInRange(billingDate, start, end)) {
            const rev = Number(li.revenue_value) * d.splitFraction;
            const cost = Number(li.estimated_delivery_cost) * d.splitFraction;
            const margin = rev - cost;
            rows.push({
              dealId: d.id,
              dealName: d.deal_name,
              lineItemName: li.name || 'Line Item',
              billingMonth: li.billing_month ? format(new Date(li.billing_month), 'MMM yyyy') : '',
              revenue: rev,
              cost,
              marginValue: margin,
              marginPercent: rev > 0 ? (margin / rev) * 100 : 0,
              owner: d.owner || '',
            });
          }
        });
      } else {
        const p = safeParseDate(d.won_date);
        if (p && isInRange(p, start, end)) {
          rows.push({
            dealId: d.id,
            dealName: d.deal_name,
            lineItemName: 'Deal Total',
            billingMonth: p ? format(p, 'MMM yyyy') : '',
            revenue: d.splitValue,
            cost: (d.estimated_delivery_cost || 0) * d.splitFraction,
            marginValue: d.splitMarginValue,
            marginPercent: d.gross_margin_percent || 0,
            owner: d.owner || '',
          });
        }
      }
    });
    return rows;
  };

  // === Helper: build rows for open deals ===
  const buildOpenDealRows = (filterFn?: (d: any) => boolean): DrillDownRow[] => {
    const subset = filterFn ? openDeals.filter(filterFn) : openDeals;
    return subset.map(d => ({
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
  };

  // === ACTUALS ===
  const closedWonDeals = deals.filter(d => d.status === 'closed_won');

  const isInRange = (date: Date, start: Date, end: Date) =>
    (isAfter(date, start) || date.getTime() === start.getTime()) &&
    (isBefore(date, end) || date.getTime() === end.getTime());

  const getActualsInRange = (start: Date, end: Date) => {
    let total = 0;
    closedWonDeals.forEach(d => {
      const items = dealLineItemsMap.get(d.id);
      if (items && items.length > 0) {
        items.forEach((li: any) => {
          const billingDate = safeParseDate(li.billing_month) ?? safeParseDate(d.won_date);
          if (billingDate && isInRange(billingDate, start, end)) {
            total += Number(li.revenue_value) * d.splitFraction;
          }
        });
      } else {
        const p = safeParseDate(d.won_date);
        if (p && isInRange(p, start, end)) {
          total += d.splitValue;
        }
      }
    });
    return total;
  };

  const actualsThisMonth = getActualsInRange(thisMonthStart, thisMonthEnd);
  const actualsThisQuarter = getActualsInRange(thisQStart, thisQEnd);

  const closedLostQ = deals.filter(d => {
    const p = safeParseDate(d.lost_date);
    return d.status === 'closed_lost' && p && isInRange(p, thisQStart, thisQEnd);
  });
  const closedLostQValue = closedLostQ.reduce((s, d) => s + d.splitValue, 0);

  // === PIPELINE ===
  const openDeals = deals.filter(d => d.status === 'open');
  const weightedPipeline = openDeals.reduce((s, d) => s + d.splitWeightedValue, 0);

  const commitThisMonth = openDeals
    .filter(d => { const p = safeParseDate(d.expected_close_date); return d.forecast_category === 'Commit' && p && isInRange(p, thisMonthStart, thisMonthEnd); })
    .reduce((s, d) => s + d.splitWeightedValue, 0);

  const bestCaseThisMonth = openDeals
    .filter(d => { const p = safeParseDate(d.expected_close_date); return (d.forecast_category === 'Commit' || d.forecast_category === 'Best Case') && p && isInRange(p, thisMonthStart, thisMonthEnd); })
    .reduce((s, d) => s + d.splitWeightedValue, 0);

  const overdueActions = openDeals.filter(d => { const p = safeParseDate(d.next_action_date); return p && isBefore(p, now); });
  const slippedDeals = openDeals.filter(d => d.slip_count > 0);

  // === NEW BUSINESS — LEADS ===
  const leadsThisMonth = deals.filter(d => {
    const dateToUse = (d as any).lead_date
      ? safeParseDate((d as any).lead_date)
      : safeParseDate(d.created_at);
    return dateToUse && isInRange(dateToUse, thisMonthStart, thisMonthEnd)
      && d.status !== 'closed_lost';
  });

  const FUNNEL_STAGES = ['Lead', 'Qualified', 'Discovery', 'Proposal', 'Commercials / Procurement', 'Verbal Commit', 'Closed Won'];

  const funnelBreakdown = FUNNEL_STAGES.map(stage => ({
    stage,
    count: leadsThisMonth.filter(d =>
      stage === 'Closed Won' ? d.status === 'closed_won' : d.stage === stage
    ).length,
  })).filter(f => f.count > 0);

  const normalizeOriginator = (d: any): string => {
    const raw = typeof d?.deal_originator === 'string' ? d.deal_originator.trim() : '';
    return raw.length > 0 ? raw : 'Not set';
  };

  const buildLeadsRows = (subset: typeof deals, dateField: 'lead' | 'close' = 'lead'): DrillDownRow[] =>
    subset.map(d => {
      const originator = normalizeOriginator(d);
      const owner = (d.owner || '').trim();
      const collaborators = owner || 'Unassigned';
      const createdDate = dateField === 'close'
        ? (d.expected_close_date ? format(new Date(d.expected_close_date), 'dd MMM yyyy') : '—')
        : (() => {
            const raw = (d as any).lead_date || d.created_at;
            return raw ? format(new Date(raw), 'dd MMM yyyy') : '';
          })();
      return {
        dealId: d.id,
        dealName: d.deal_name,
        lineItemName: originator,
        billingMonth: d.created_at ? format(new Date(d.created_at), 'dd MMM yyyy') : '',
        revenue: d.value || 0,
        cost: 0,
        marginValue: 0,
        marginPercent: 0,
        owner,
        originator,
        collaborators,
        stage: d.status === 'closed_won' ? 'Closed Won' : d.status === 'closed_lost' ? 'Closed Lost' : d.stage,
        createdDate,
        company: getCompany(d.company_id || '')?.company_name || '—',
      };
    });

  // === MARGIN ===
  const pipelineMargin = openDeals.reduce((s, d) => s + d.splitMarginValue, 0);
  const weightedMargin = openDeals.reduce((s, d) => s + (d.splitMarginValue * (d.confidence_percent / 100)), 0);
  const closedWonMargin = closedWonDeals.reduce((s, d) => s + d.splitMarginValue, 0);
  const dealsWithMargin = [...openDeals, ...closedWonDeals].filter(d => (d.estimated_delivery_cost ?? 0) > 0);
  const avgMarginPercent = dealsWithMargin.length > 0
    ? dealsWithMargin.reduce((s, d) => s + (d.gross_margin_percent || 0), 0) / dealsWithMargin.length
    : 0;
  const lowMarginDeals = openDeals.filter(d => (d.estimated_delivery_cost ?? 0) > 0 && (d.gross_margin_percent ?? 0) < 20);
  const negativeMarginDeals = openDeals.filter(d => (d.estimated_delivery_cost ?? 0) > 0 && (d.gross_margin_percent ?? 0) < 0);

  // Activity widgets
  const filteredActivities = selectedView === 'COEX'
    ? activities
    : activities.filter(a => a.owner === selectedView);

  const meetingsThisWeek = filteredActivities.filter(a => {
    const d = new Date(a.activity_date);
    return a.activity_type === 'Meeting' && isAfter(d, thisWeekStart) && isBefore(d, thisWeekEnd);
  });

  const overdueFollowUps = filteredActivities.filter(a =>
    a.next_step_date && a.status !== 'Cancelled' && isBefore(new Date(a.next_step_date), now) && a.next_step
  );

  const fourteenDaysAgo = subDays(now, 14);
  const dealActivityMap = new Map<string, Date>();
  activities.forEach(a => {
    if (a.deal_id) {
      const existing = dealActivityMap.get(a.deal_id);
      const actDate = new Date(a.activity_date);
      if (!existing || actDate > existing) dealActivityMap.set(a.deal_id, actDate);
    }
  });
  const dealsNoRecentActivity = openDeals.filter(d => {
    const lastAct = dealActivityMap.get(d.id);
    return !lastAct || isBefore(lastAct, fourteenDaysAgo);
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{selectedView === 'COEX' ? 'COEX overview' : selectedView} · {format(now, 'MMMM yyyy')}</p>
      </div>

      {/* ACTUALS SECTION */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <CheckCircle2 size={14} /> Actuals — Closed Revenue
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <KpiCard
            label="Actuals This Month"
            value={formatGBP(actualsThisMonth)}
            icon={CheckCircle2}
            variant="green"
            sub={`${closedWonDeals.filter(d => d.won_date && !isBefore(new Date(d.won_date), thisMonthStart) && !isAfter(new Date(d.won_date), thisMonthEnd)).length} deals`}
            onClick={() => openDrillDown('Actuals This Month', buildActualRows(thisMonthStart, thisMonthEnd))}
          />
          <KpiCard
            label="Actuals This Quarter"
            value={formatGBP(actualsThisQuarter)}
            icon={CheckCircle2}
            variant="green"
            sub={`${closedWonDeals.filter(d => d.won_date && !isBefore(new Date(d.won_date), thisQStart) && !isAfter(new Date(d.won_date), thisQEnd)).length} deals`}
            onClick={() => openDrillDown('Actuals This Quarter', buildActualRows(thisQStart, thisQEnd))}
          />
          <KpiCard
            label="Closed Lost (Quarter)"
            value={formatGBP(closedLostQValue)}
            icon={XCircle}
            variant="red"
            sub={`${closedLostQ.length} deals`}
            onClick={() => openDrillDown('Closed Lost This Quarter', closedLostQ.map(d => ({
              dealId: d.id, dealName: d.deal_name, lineItemName: 'Closed Lost',
              billingMonth: d.lost_date ? format(new Date(d.lost_date), 'MMM yyyy') : '',
              revenue: d.splitValue, cost: (d.estimated_delivery_cost || 0) * d.splitFraction,
              marginValue: d.splitMarginValue, marginPercent: d.gross_margin_percent || 0, owner: d.owner || '',
            })))}
          />
        </div>
      </div>

      {/* PIPELINE FORECAST SECTION */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <BarChart3 size={14} /> Pipeline Forecast — Open Deals
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Open Weighted Pipeline"
            value={formatGBP(weightedPipeline)}
            icon={Target}
            sub={`${openDeals.length} deals`}
            onClick={() => openDrillDown('Open Weighted Pipeline', buildOpenDealRows())}
          />
          <KpiCard
            label="Commit This Month"
            value={formatGBP(commitThisMonth)}
            icon={TrendingUp}
            variant="green"
            onClick={() => openDrillDown('Commit This Month', buildOpenDealRows(d => {
              const p = safeParseDate(d.expected_close_date);
              return d.forecast_category === 'Commit' && !!p && isBefore(p, thisMonthEnd) && isAfter(p, thisMonthStart);
            }))}
          />
          <KpiCard
            label="Best Case This Month"
            value={formatGBP(bestCaseThisMonth)}
            icon={TrendingUp}
            onClick={() => openDrillDown('Best Case This Month', buildOpenDealRows(d => {
              const p = safeParseDate(d.expected_close_date);
              return (d.forecast_category === 'Commit' || d.forecast_category === 'Best Case') && !!p && isBefore(p, thisMonthEnd) && isAfter(p, thisMonthStart);
            }))}
          />
          <KpiCard
            label="Total Open Pipeline"
            value={formatGBP(openDeals.reduce((s, d) => s + d.splitValue, 0))}
            icon={PoundSterling}
            onClick={() => openDrillDown('Total Open Pipeline', buildOpenDealRows())}
          />
        </div>
      </div>

      {/* NEW BUSINESS — LEADS */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Users size={14} /> New Business — Leads
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Leads This Month"
            value={String(leadsThisMonth.length)}
            icon={Users}
            sub={`${new Set(leadsThisMonth.map(d => normalizeOriginator(d)).filter(o => o !== 'Not set')).size} originators`}
            onClick={() => openDrillDown('Leads This Month', buildLeadsRows(leadsThisMonth), 'leads')}
          />
        </div>

        {funnelBreakdown.length > 0 && (
          <div className="bg-card rounded-lg border border-border p-4 mt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Funnel — {leadsThisMonth.length} leads entered this month
            </p>
            <div className="flex flex-wrap gap-2">
              {funnelBreakdown.map(f => (
                <button
                  key={f.stage}
                  onClick={() => openDrillDown(
                    `${f.stage} — leads entered this month`,
                    buildLeadsRows(leadsThisMonth.filter(d =>
                      f.stage === 'Closed Won' ? d.status === 'closed_won' : d.stage === f.stage
                    )),
                    'leads'
                  )}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-background hover:border-primary/40 hover:bg-accent transition-colors text-sm cursor-pointer"
                >
                  <span className="font-semibold text-card-foreground">{f.count}</span>
                  <span className="text-muted-foreground">{f.stage}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>


      {/* PROFITABILITY */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Percent size={14} /> Profitability
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Pipeline Margin"
            value={formatGBP(pipelineMargin)}
            icon={TrendingUp}
            variant={pipelineMargin >= 0 ? 'green' : 'red'}
            sub={`${openDeals.filter(d => (d.estimated_delivery_cost ?? 0) > 0).length} deals costed`}
            onClick={() => openDrillDown('Pipeline Margin', buildOpenDealRows(d => (d.estimated_delivery_cost ?? 0) > 0))}
          />
          <KpiCard
            label="Weighted Margin"
            value={formatGBP(Math.round(weightedMargin))}
            icon={Target}
            sub="Confidence-adjusted"
            onClick={() => openDrillDown('Weighted Margin (Pipeline)', buildOpenDealRows(d => (d.estimated_delivery_cost ?? 0) > 0))}
          />
          <KpiCard
            label="Closed Won Margin"
            value={formatGBP(closedWonMargin)}
            icon={CheckCircle2}
            variant="green"
            sub={`${closedWonDeals.filter(d => (d.estimated_delivery_cost ?? 0) > 0).length} deals`}
            onClick={() => openDrillDown('Closed Won Margin', closedWonDeals.filter(d => (d.estimated_delivery_cost ?? 0) > 0).map(d => ({
              dealId: d.id, dealName: d.deal_name, lineItemName: 'Closed Won',
              billingMonth: d.won_date ? format(new Date(d.won_date), 'MMM yyyy') : '',
              revenue: d.splitValue, cost: (d.estimated_delivery_cost || 0) * d.splitFraction,
              marginValue: d.splitMarginValue, marginPercent: d.gross_margin_percent || 0, owner: d.owner || '',
            })))}
          />
          <KpiCard
            label="Avg Margin %"
            value={`${Math.round(avgMarginPercent)}%`}
            icon={Percent}
            variant={avgMarginPercent >= 20 ? 'green' : avgMarginPercent >= 0 ? 'amber' : 'red'}
            sub={`${dealsWithMargin.length} deals with costs`}
            onClick={() => openDrillDown('All Deals With Margins', dealsWithMargin.map(d => ({
              dealId: d.id, dealName: d.deal_name, lineItemName: d.status === 'closed_won' ? 'Closed Won' : d.forecast_category,
              billingMonth: (d.won_date || d.expected_close_date) ? format(new Date(d.won_date || d.expected_close_date!), 'MMM yyyy') : '',
              revenue: d.splitValue, cost: (d.estimated_delivery_cost || 0) * d.splitFraction,
              marginValue: d.splitMarginValue, marginPercent: d.gross_margin_percent || 0, owner: d.owner || '',
            })))}
          />
        </div>
        {lowMarginDeals.length > 0 && (
          <div className="mt-3 bg-card rounded-lg border border-border p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {negativeMarginDeals.length > 0 && <span className="text-health-red mr-1">⚠</span>}
              Low Margin Deals ({lowMarginDeals.length})
            </h3>
            <div className="space-y-1.5">
              {lowMarginDeals.slice(0, 8).map(d => (
                <a key={d.id} href={`/deals/${d.id}`} className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors text-sm">
                  <span className="font-medium text-card-foreground">{d.deal_name}</span>
                  <span className={`text-xs font-medium ${(d.gross_margin_percent ?? 0) < 0 ? 'text-health-red' : 'text-health-amber'}`}>
                    {Math.round(d.gross_margin_percent ?? 0)}% · {formatGBP(d.gross_margin_value || 0)}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* OUTSTANDING ACTIONS */}
      <OutstandingActions />

      {/* ACTIVITY & HEALTH */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Meetings This Week" value={String(meetingsThisWeek.length)} icon={CalendarDays} />
        <KpiCard label="Overdue Follow-ups" value={String(overdueFollowUps.length)} icon={TriangleAlert} variant={overdueFollowUps.length > 0 ? 'red' : 'default'} />
        <KpiCard label="Overdue Actions" value={String(overdueActions.length)} icon={AlertTriangle} variant={overdueActions.length > 0 ? 'amber' : 'default'} />
        <KpiCard label="Deals — No Activity (14d)" value={String(dealsNoRecentActivity.length)} icon={Users} variant={dealsNoRecentActivity.length > 0 ? 'amber' : 'default'} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-border p-5">
          <h2 className="text-sm font-semibold text-card-foreground mb-3">Overdue Next Actions</h2>
          {overdueActions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No overdue actions 🎉</p>
          ) : (
            <div className="space-y-2">
              {overdueActions.map(d => (
                <a key={d.id} href={`/deals/${d.id}`} className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors text-sm">
                  <div>
                    <span className="font-medium text-card-foreground">{d.deal_name}</span>
                    <span className="text-muted-foreground ml-2">{getCompany(d.company_id || '')?.company_name}</span>
                  </div>
                  <span className="text-health-red text-xs">{d.next_action_date}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-lg border border-border p-5">
          <h2 className="text-sm font-semibold text-card-foreground mb-3">Slipped Deals</h2>
          {slippedDeals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No slipped deals</p>
          ) : (
            <div className="space-y-2">
              {slippedDeals.map(d => (
                <a key={d.id} href={`/deals/${d.id}`} className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors text-sm">
                  <div>
                    <span className="font-medium text-card-foreground">{d.deal_name}</span>
                    <span className="text-muted-foreground ml-2">slipped {d.slip_count}x</span>
                  </div>
                  <span className="text-health-amber text-xs">{d.expected_close_date}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {dealsNoRecentActivity.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-5">
          <h2 className="text-sm font-semibold text-card-foreground mb-3">Deals With No Recent Activity (14+ days)</h2>
          <div className="space-y-2">
            {dealsNoRecentActivity.slice(0, 10).map(d => {
              const lastAct = dealActivityMap.get(d.id);
              return (
                <a key={d.id} href={`/deals/${d.id}`} className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors text-sm">
                  <div>
                    <span className="font-medium text-card-foreground">{d.deal_name}</span>
                    <span className="text-muted-foreground ml-2">{getCompany(d.company_id || '')?.company_name}</span>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {lastAct ? `Last: ${format(lastAct, 'dd MMM')}` : 'No activity'}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {overdueFollowUps.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-5">
          <h2 className="text-sm font-semibold text-card-foreground mb-3">Overdue Follow-ups</h2>
          <div className="space-y-2">
            {overdueFollowUps.slice(0, 10).map(a => (
              <div key={a.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors text-sm">
                <div>
                  <span className="font-medium text-card-foreground">{a.title}</span>
                  <span className="text-muted-foreground ml-2">{a.next_step}</span>
                </div>
                <span className="text-health-red text-xs">{a.next_step_date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <DrillDownPanel
        open={drillDown.open}
        onOpenChange={(open) => setDrillDown(prev => ({ ...prev, open }))}
        title={drillDown.title}
        rows={drillDown.rows}
        variant={drillDown.variant}
      />
    </div>
  );
};

export default DashboardPage;
