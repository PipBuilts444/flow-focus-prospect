import { useFilteredCrm } from '@/hooks/useFilteredCrm';
import { useUserView } from '@/context/UserViewContext';
import { useAllActivities } from '@/hooks/useActivities';
import { format, isAfter, isBefore, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfWeek, endOfWeek, subDays } from 'date-fns';
import { TrendingUp, AlertTriangle, PoundSterling, Target, CheckCircle2, XCircle, Clock, CalendarDays, Users, TriangleAlert } from 'lucide-react';
import { formatGBP } from '@/lib/currency';
import { useNavigate } from 'react-router-dom';

const KpiCard = ({ label, value, icon: Icon, variant = 'default' }: { label: string; value: string; icon: any; variant?: string }) => (
  <div className="bg-card rounded-lg border border-border p-5">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <Icon size={18} className={variant === 'green' ? 'text-health-green' : variant === 'red' ? 'text-health-red' : variant === 'amber' ? 'text-health-amber' : 'text-primary'} />
    </div>
    <p className="text-2xl font-bold text-card-foreground">{value}</p>
  </div>
);

const DashboardPage = () => {
  const { deals, getCompany, getDealHealth, loading } = useFilteredCrm();
  const { selectedView } = useUserView();
  const { activities } = useAllActivities();
  const navigate = useNavigate();
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const thisQStart = startOfQuarter(now);
  const thisQEnd = endOfQuarter(now);
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });

  if (loading) return <div className="p-6"><p className="text-muted-foreground">Loading…</p></div>;

  const openDeals = deals.filter(d => d.status === 'open');
  const totalPipeline = openDeals.reduce((s, d) => s + d.value, 0);
  const weightedPipeline = openDeals.reduce((s, d) => s + (d.weighted_value || 0), 0);

  const commitThisMonth = openDeals
    .filter(d => d.forecast_category === 'Commit' && d.expected_close_date && isBefore(new Date(d.expected_close_date), thisMonthEnd) && isAfter(new Date(d.expected_close_date), thisMonthStart))
    .reduce((s, d) => s + (d.weighted_value || 0), 0);

  const bestCaseThisMonth = openDeals
    .filter(d => (d.forecast_category === 'Commit' || d.forecast_category === 'Best Case') && d.expected_close_date && isBefore(new Date(d.expected_close_date), thisMonthEnd) && isAfter(new Date(d.expected_close_date), thisMonthStart))
    .reduce((s, d) => s + (d.weighted_value || 0), 0);

  const closedWonQ = deals.filter(d => d.status === 'closed_won' && d.won_date && isAfter(new Date(d.won_date), thisQStart) && isBefore(new Date(d.won_date), thisQEnd));
  const closedLostQ = deals.filter(d => d.status === 'closed_lost' && d.lost_date && isAfter(new Date(d.lost_date), thisQStart) && isBefore(new Date(d.lost_date), thisQEnd));

  const overdueActions = openDeals.filter(d => d.next_action_date && isBefore(new Date(d.next_action_date), now));
  const slippedDeals = openDeals.filter(d => d.slip_count > 0);

  // Activity widgets - filter by owner if not COEX
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

  // Deals with no activity in last 14 days
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Pipeline" value={formatGBP(totalPipeline)} icon={PoundSterling} />
        <KpiCard label="Weighted Pipeline" value={formatGBP(weightedPipeline)} icon={Target} />
        <KpiCard label="Commit This Month" value={formatGBP(commitThisMonth)} icon={TrendingUp} variant="green" />
        <KpiCard label="Best Case This Month" value={formatGBP(bestCaseThisMonth)} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Closed Won (Q)" value={formatGBP(closedWonQ.reduce((s, d) => s + d.value, 0))} icon={CheckCircle2} variant="green" />
        <KpiCard label="Closed Lost (Q)" value={formatGBP(closedLostQ.reduce((s, d) => s + d.value, 0))} icon={XCircle} variant="red" />
        <KpiCard label="Overdue Actions" value={String(overdueActions.length)} icon={AlertTriangle} variant={overdueActions.length > 0 ? 'amber' : 'default'} />
        <KpiCard label="Slipped Deals" value={String(slippedDeals.length)} icon={Clock} variant={slippedDeals.length > 0 ? 'amber' : 'default'} />
      </div>

      {/* Activity KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label="Meetings This Week" value={String(meetingsThisWeek.length)} icon={CalendarDays} />
        <KpiCard label="Overdue Follow-ups" value={String(overdueFollowUps.length)} icon={TriangleAlert} variant={overdueFollowUps.length > 0 ? 'red' : 'default'} />
        <KpiCard label="Deals — No Recent Activity" value={String(dealsNoRecentActivity.length)} icon={Users} variant={dealsNoRecentActivity.length > 0 ? 'amber' : 'default'} />
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

      {/* Deals with no recent activity */}
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

      {/* Overdue Follow-ups detail */}
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
