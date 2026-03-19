import { useCrm } from '@/context/CrmContext';
import { format, isAfter, isBefore, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from 'date-fns';
import { TrendingUp, AlertTriangle, DollarSign, Target, CheckCircle2, XCircle, Clock } from 'lucide-react';

const formatCurrency = (v: number) => `£${v.toLocaleString('en-GB')}`;

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
  const { deals, getCompany, getDealHealth, loading } = useCrm();
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const thisQStart = startOfQuarter(now);
  const thisQEnd = endOfQuarter(now);

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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Pipeline overview · {format(now, 'MMMM yyyy')}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Pipeline" value={formatCurrency(totalPipeline)} icon={DollarSign} />
        <KpiCard label="Weighted Pipeline" value={formatCurrency(weightedPipeline)} icon={Target} />
        <KpiCard label="Commit This Month" value={formatCurrency(commitThisMonth)} icon={TrendingUp} variant="green" />
        <KpiCard label="Best Case This Month" value={formatCurrency(bestCaseThisMonth)} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Closed Won (Q)" value={formatCurrency(closedWonQ.reduce((s, d) => s + d.value, 0))} icon={CheckCircle2} variant="green" />
        <KpiCard label="Closed Lost (Q)" value={formatCurrency(closedLostQ.reduce((s, d) => s + d.value, 0))} icon={XCircle} variant="red" />
        <KpiCard label="Overdue Actions" value={String(overdueActions.length)} icon={AlertTriangle} variant={overdueActions.length > 0 ? 'amber' : 'default'} />
        <KpiCard label="Slipped Deals" value={String(slippedDeals.length)} icon={Clock} variant={slippedDeals.length > 0 ? 'amber' : 'default'} />
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
    </div>
  );
};

export default DashboardPage;
