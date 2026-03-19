import { useCrm } from '@/context/CrmContext';
import { DEAL_STAGES, DealStage } from '@/types/crm';
import { useNavigate } from 'react-router-dom';

const formatCurrency = (v: number) => `£${(v / 1000).toFixed(0)}k`;

const healthDot: Record<string, string> = {
  green: 'bg-health-green',
  amber: 'bg-health-amber',
  red: 'bg-health-red',
};

const PipelinePage = () => {
  const { deals, getCompany, getDealHealth, loading } = useCrm();
  const navigate = useNavigate();
  const openStages = DEAL_STAGES.filter(s => s !== 'Closed Won' && s !== 'Closed Lost');

  if (loading) return <div className="p-6"><p className="text-muted-foreground">Loading…</p></div>;

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
        <p className="text-sm text-muted-foreground">Kanban view of active deals</p>
      </div>
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-3 min-w-max h-full pb-4">
          {openStages.map(stage => {
            const stageDeals = deals.filter(d => d.stage === stage && d.status === 'open');
            const total = stageDeals.reduce((s, d) => s + d.value, 0);
            return (
              <div key={stage} className="w-72 flex flex-col bg-secondary/50 rounded-lg">
                <div className="px-3 py-2.5 border-b border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{stage}</span>
                    <span className="text-xs text-muted-foreground">{stageDeals.length}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(total)}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin">
                  {stageDeals.map(deal => {
                    const company = getCompany(deal.company_id || '');
                    const health = getDealHealth(deal);
                    return (
                      <button
                        key={deal.id}
                        onClick={() => navigate(`/deals/${deal.id}`)}
                        className="w-full text-left bg-card rounded-md border border-border p-3 hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium text-card-foreground leading-tight">{deal.deal_name}</span>
                          <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${healthDot[health]}`} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{company?.company_name}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-semibold text-card-foreground">£{deal.value.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground">{deal.expected_close_date}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-accent text-accent-foreground">{deal.forecast_category}</span>
                          {deal.next_action_date && (
                            <span className="text-xs text-muted-foreground">{deal.next_action_date}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {stageDeals.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">No deals</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PipelinePage;
