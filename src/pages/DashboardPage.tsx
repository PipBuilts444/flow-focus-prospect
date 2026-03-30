import { useFilteredCrm } from '@/hooks/useFilteredCrm';
import { useUserView } from '@/context/UserViewContext';
import { useAllActivities } from '@/hooks/useActivities';
import { useState, useEffect, useMemo } from 'react';
import { format, isAfter, isBefore, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfWeek, endOfWeek, subDays } from 'date-fns';
import { TrendingUp, AlertTriangle, PoundSterling, Target, CheckCircle2, XCircle, Clock, CalendarDays, Users, TriangleAlert, BarChart3, Percent } from 'lucide-react';
import OutstandingActions from '@/components/OutstandingActions';
import { formatGBP } from '@/lib/currency';
import { safeParseDate } from '@/lib/dateUtils';
import { supabase } from '@/integrations/supabase/client';

const KpiCard = ({ label, value, icon: Icon, variant = 'default', sub }: { label: string; value: string; icon: any; variant?: string; sub?: string }) => (
  <div className="bg-card rounded-lg border border-border p-5">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <Icon size={18} className={variant === 'green' ? 'text-health-green' : variant === 'red' ? 'text-health-red' : variant === 'amber' ? 'text-health-amber' : 'text-primary'} />
    </div>
    <p className="text-2xl font-bold text-card-foreground">{value}</p>
    {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
  </div>
);

const DashboardPage = () => {
  const { deals, getCompany, getDealHealth, loading } = useFilteredCrm();
  const { selectedView } = useUserView();
  const { activities } = useAllActivities();
  const [lineItems, setLineItems] = useState<any[]>([]);
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const thisQStart = startOfQuarter(now);
  const thisQEnd = endOfQuarter(now);
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });

  useEffect(() => {
    supabase.from('deal_line_items').select('*').eq('is_deleted', false).then(({ data }) => {
      if (data) setLineItems(data);
    });
  }, [deals]);

  if (loading) return <div className="p-6"><p className="text-muted-foreground">Loading…</p></div>;

  // Build line items map
  const dealLineItemsMap = new Map<string, any[]>();
  lineItems.forEach(li => {
    const arr = dealLineItemsMap.get(li.deal_id) || [];
    arr.push(li);
    dealLineItemsMap.set(li.deal_id, arr);
  });

  // === ACTUALS (Closed Won, allocated by line item billing_month or deal won_date) ===
  const closedWonDeals = deals.filter(d => d.status === 'closed_won');

  const getActualsInRange = (start: Date, end: Date) => {
    let total = 0;
    closedWonDeals.forEach(d => {
      const items = dealLineItemsMap.get(d.id);
      if (items && items.length > 0) {
        items.forEach((li: any) => {
          const billingDate = safeParseDate(li.billing_month) ?? safeParseDate(d.won_date);
          if (billingDate && isAfter(billingDate, start) && isBefore(billingDate, end)) {
            total += Number(li.revenue_value) * d.splitFraction;
          }
        });
      } else {
        const p = safeParseDate(d.won_date);
        if (p && isAfter(p, start) && isBefore(p, end)) {
          total += d.splitValue;
        }
      }
    });
    return total;
  };

  const actualsThisMonth = getActualsInRange(thisMonthStart, thisMonthEnd);
  const actualsThisQuarter = getActualsInRange(thisQStart, thisQEnd);

  const closedLostQ = deals
    .filter(d => { const p = safeParseDate(d.lost_date); return d.status === 'closed_lost' && p && isAfter(p, thisQStart) && isBefore(p, thisQEnd); });
  const closedLostQValue = closedLostQ.reduce((s, d) => s + d.splitValue, 0);

  // === PIPELINE FORECAST (Open deals only) ===
  const openDeals = deals.filter(d => d.status === 'open');
  const weightedPipeline = openDeals.reduce((s, d) => s + d.splitWeightedValue, 0);

  const commitThisMonth = openDeals
    .filter(d => { const p = safeParseDate(d.expected_close_date); return d.forecast_category === 'Commit' && p && isBefore(p, thisMonthEnd) && isAfter(p, thisMonthStart); })
    .reduce((s, d) => s + d.splitWeightedValue, 0);

  const bestCaseThisMonth = openDeals
    .filter(d => { const p = safeParseDate(d.expected_close_date); return (d.forecast_category === 'Commit' || d.forecast_category === 'Best Case') && p && isBefore(p, thisMonthEnd) && isAfter(p, thisMonthStart); })
    .reduce((s, d) => s + d.splitWeightedValue, 0);

  const overdueActions = openDeals.filter(d => { const p = safeParseDate(d.next_action_date); return p && isBefore(p, now); });
  const slippedDeals = openDeals.filter(d => d.slip_count > 0);

  // === MARGIN METRICS ===
  const pipelineMargin = openDeals.reduce((s, d) => s + d.splitMarginValue, 0);
  const weightedMargin = openDeals.reduce((s, d) => {
    return s + (d.splitMarginValue * (d.confidence_percent / 100));
  }, 0);
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
          <KpiCard label="Actuals This Month" value={formatGBP(actualsThisMonth)} icon={CheckCircle2} variant="green" sub={`${closedWonDeals.filter(d => d.won_date && isAfter(new Date(d.won_date), thisMonthStart) && isBefore(new Date(d.won_date), thisMonthEnd)).length} deals`} />
          <KpiCard label="Actuals This Quarter" value={formatGBP(actualsThisQuarter)} icon={CheckCircle2} variant="green" sub={`${closedWonDeals.filter(d => d.won_date && isAfter(new Date(d.won_date), thisQStart) && isBefore(new Date(d.won_date), thisQEnd)).length} deals`} />
          <KpiCard label="Closed Lost (Quarter)" value={formatGBP(closedLostQValue)} icon={XCircle} variant="red" sub={`${closedLostQ.length} deals`} />
        </div>
      </div>

      {/* PIPELINE FORECAST SECTION */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <BarChart3 size={14} /> Pipeline Forecast — Open Deals
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Open Weighted Pipeline" value={formatGBP(weightedPipeline)} icon={Target} sub={`${openDeals.length} deals`} />
          <KpiCard label="Commit This Month" value={formatGBP(commitThisMonth)} icon={TrendingUp} variant="green" />
          <KpiCard label="Best Case This Month" value={formatGBP(bestCaseThisMonth)} icon={TrendingUp} />
          <KpiCard label="Total Open Pipeline" value={formatGBP(openDeals.reduce((s, d) => s + d.splitValue, 0))} icon={PoundSterling} />
        </div>
      </div>

      {/* PROFITABILITY */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Percent size={14} /> Profitability
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Pipeline Margin" value={formatGBP(pipelineMargin)} icon={TrendingUp} variant={pipelineMargin >= 0 ? 'green' : 'red'} sub={`${openDeals.filter(d => (d.estimated_delivery_cost ?? 0) > 0).length} deals costed`} />
          <KpiCard label="Weighted Margin" value={formatGBP(Math.round(weightedMargin))} icon={Target} sub="Confidence-adjusted" />
          <KpiCard label="Closed Won Margin" value={formatGBP(closedWonMargin)} icon={CheckCircle2} variant="green" sub={`${closedWonDeals.filter(d => (d.estimated_delivery_cost ?? 0) > 0).length} deals`} />
          <KpiCard label="Avg Margin %" value={`${Math.round(avgMarginPercent)}%`} icon={Percent} variant={avgMarginPercent >= 20 ? 'green' : avgMarginPercent >= 0 ? 'amber' : 'red'} sub={`${dealsWithMargin.length} deals with costs`} />
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
    </div>
  );
};

export default DashboardPage;
