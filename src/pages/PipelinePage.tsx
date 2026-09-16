import { useState } from 'react';
import { useFilteredCrm } from '@/hooks/useFilteredCrm';
import { useCrm } from '@/context/CrmContext';
import { DEAL_STAGES } from '@/types/crm';
import type { Deal, DealStage } from '@/types/crm';
import { useNavigate } from 'react-router-dom';
import { formatGBP, formatGBPCompact } from '@/lib/currency';
import StageGateModal from '@/components/StageGateModal';
import { toast } from 'sonner';

const healthDot: Record<string, string> = {
  green: 'bg-health-green',
  amber: 'bg-health-amber',
  red: 'bg-health-red',
};

const PipelinePage = () => {
  const { deals, getCompany, getDealHealth, loading } = useFilteredCrm();
  const { updateDeal } = useCrm();
  const navigate = useNavigate();
  const openStages = DEAL_STAGES.filter(s => s !== 'Closed Won' && s !== 'Closed Lost');

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);
  const [gate, setGate] = useState<{ deal: Deal; target: DealStage } | null>(null);
  const [gateLoading, setGateLoading] = useState(false);

  const handleDrop = (stage: DealStage) => {
    setDragOverStage(null);
    const id = draggingId;
    setDraggingId(null);
    if (!id) return;
    const deal = deals.find(d => d.id === id);
    if (!deal || deal.stage === stage) return;
    setGate({ deal: deal as unknown as Deal, target: stage });
  };

  const handleConfirm = async (updates: Record<string, any>) => {
    if (!gate) return;
    setGateLoading(true);
    try {
      await updateDeal(gate.deal.id, updates);
      toast.success(`Deal moved to ${updates.stage}`);
      setGate(null);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update deal');
    } finally {
      setGateLoading(false);
    }
  };

  if (loading) return <div className="p-6"><p className="text-muted-foreground">Loading…</p></div>;

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
        <p className="text-sm text-muted-foreground">Kanban view of active deals — drag a card to change stage</p>
      </div>
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-3 min-w-max h-full pb-4">
          {openStages.map(stage => {
            const stageDeals = deals.filter(d => d.stage === stage && d.status === 'open');
            const total = stageDeals.reduce((s, d) => s + d.value, 0);
            return (
              <div
                key={stage}
                onDragOver={e => { e.preventDefault(); setDragOverStage(stage); }}
                onDragLeave={() => setDragOverStage(prev => (prev === stage ? null : prev))}
                onDrop={e => { e.preventDefault(); handleDrop(stage); }}
                className={`w-72 flex flex-col rounded-lg transition-colors ${dragOverStage === stage ? 'bg-primary/10 ring-2 ring-primary/40' : stage === 'Prospect' ? 'bg-muted/60 border border-dashed border-border' : 'bg-secondary/50'}`}
              >
                <div className={`px-3 py-2.5 border-b border-border ${stage === 'Prospect' ? 'bg-muted rounded-t-lg' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${stage === 'Prospect' ? 'text-muted-foreground' : 'text-foreground'}`}>{stage}</span>
                    <span className="text-xs text-muted-foreground">{stageDeals.length}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatGBPCompact(total)}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin min-h-[120px]">
                  {stageDeals.map(deal => {
                    const company = getCompany(deal.company_id || '');
                    const health = getDealHealth(deal);
                    return (
                      <div
                        key={deal.id}
                        role="button"
                        tabIndex={0}
                        draggable
                        onDragStart={e => { setDraggingId(deal.id); e.dataTransfer.effectAllowed = 'move'; }}
                        onDragEnd={() => { setDraggingId(null); setDragOverStage(null); }}
                        onClick={() => navigate(`/deals/${deal.id}`)}
                        onKeyDown={e => { if (e.key === 'Enter') navigate(`/deals/${deal.id}`); }}
                        className={`w-full text-left bg-card rounded-md border border-border p-3 hover:shadow-md transition-shadow cursor-pointer ${draggingId === deal.id ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium text-card-foreground leading-tight">{deal.deal_name}</span>
                          <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${healthDot[health]}`} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{company?.company_name}</p>
                        {deal.owner && <p className="text-xs text-muted-foreground mt-0.5">{deal.owner}</p>}
                        {(deal as any).deal_originator && (deal as any).deal_originator !== deal.owner && (
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5">Originated by {(deal as any).deal_originator}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-semibold text-card-foreground">{formatGBP(deal.value)}</span>
                          <span className="text-xs text-muted-foreground">{deal.expected_close_date}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-accent text-accent-foreground">{deal.forecast_category}</span>
                          {deal.next_action_date && (
                            <span className="text-xs text-muted-foreground">{deal.next_action_date}</span>
                          )}
                        </div>
                      </div>
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

      {gate && (
        <StageGateModal
          open={!!gate}
          deal={gate.deal}
          targetStage={gate.target}
          onConfirm={handleConfirm}
          onCancel={() => setGate(null)}
          loading={gateLoading}
        />
      )}
    </div>
  );
};

export default PipelinePage;
