import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCrm } from '@/context/CrmContext';
import { DEAL_STAGES } from '@/types/crm';
import type { DealStage } from '@/types/crm';
import { ArrowLeft, Building2, User, Calendar, AlertTriangle, TrendingUp, Trash2, ChevronRight, Pencil, Users } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { formatGBP } from '@/lib/currency';
import ActivityTimeline from '@/components/ActivityTimeline';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import StageGateModal from '@/components/StageGateModal';
import EditDealModal from '@/components/EditDealModal';
import { STAGE_FIELDS } from '@/lib/stageRequirements';
import { toast } from 'sonner';
import { useUserView } from '@/context/UserViewContext';
import { supabase } from '@/integrations/supabase/client';
import type { DealOwner } from '@/hooks/useDealOwners';

const healthLabel: Record<string, { text: string; cls: string }> = {
  green: { text: 'Healthy', cls: 'bg-health-green/15 text-health-green' },
  amber: { text: 'At Risk', cls: 'bg-health-amber/15 text-health-amber' },
  red: { text: 'Critical', cls: 'bg-health-red/15 text-health-red' },
};

const STAGE_ORDER = DEAL_STAGES.filter(s => s !== 'Closed Won' && s !== 'Closed Lost');

const DealDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getDeal, getCompany, getContact, getDealHealth, softDeleteDeal, updateDeal } = useCrm();
  const { selectedView } = useUserView();
  const [showDelete, setShowDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [stageTarget, setStageTarget] = useState<DealStage | null>(null);
  const [stageLoading, setStageLoading] = useState(false);
  const [dealOwners, setDealOwners] = useState<DealOwner[]>([]);

  const deal = getDeal(id || '');

  useEffect(() => {
    if (!id) return;
    supabase.from('deal_owners').select('*').eq('deal_id', id).order('role').then(({ data }) => {
      if (data) setDealOwners(data as DealOwner[]);
    });
  }, [id, showEdit]);
  if (!deal) return <div className="p-6"><p className="text-muted-foreground">Deal not found</p></div>;

  const company = getCompany(deal.company_id || '');
  const contact = getContact(deal.primary_contact_id || '');
  const health = getDealHealth(deal);
  const hl = healthLabel[health];
  const currentStageIdx = STAGE_ORDER.indexOf(deal.stage as any);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await softDeleteDeal(deal.id, selectedView === 'COEX' ? undefined : selectedView);
      toast.success('Deal deleted');
      navigate('/deals');
    } catch {
      toast.error('Failed to delete deal');
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  };

  const handleStageConfirm = async (updates: Record<string, any>) => {
    setStageLoading(true);
    try {
      await updateDeal(deal.id, updates);
      toast.success(`Deal moved to ${updates.stage}`);
      setStageTarget(null);
    } catch {
      toast.error('Failed to update deal');
    } finally {
      setStageLoading(false);
    }
  };

  const monthlyRevenue: { month: string; amount: number }[] = [];
  if (deal.expected_start_date && deal.delivery_duration_months > 0) {
    const start = new Date(deal.expected_start_date);
    const monthlyAmt = deal.value / deal.delivery_duration_months;
    for (let i = 0; i < deal.delivery_duration_months; i++) {
      const m = addMonths(start, i);
      monthlyRevenue.push({ month: format(m, 'MMM yyyy'), amount: Math.round(monthlyAmt) });
    }
  }

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm text-card-foreground">{value || '—'}</p>
    </div>
  );

  const logActivityUrl = `/activities/new?deal_id=${deal.id}${deal.company_id ? `&company_id=${deal.company_id}` : ''}${deal.primary_contact_id ? `&contact_id=${deal.primary_contact_id}` : ''}`;

  // Determine which stage sections to show based on current deal stage
  const stagesReached = DEAL_STAGES.filter(s => {
    if (s === 'Closed Won' || s === 'Closed Lost') return deal.stage === s;
    const idx = STAGE_ORDER.indexOf(s);
    return idx <= currentStageIdx;
  });

  // Field value getter with new fields
  const getVal = (key: string) => (deal as any)[key] ?? '';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{deal.deal_name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-muted-foreground">{company?.company_name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${hl.cls}`}>{hl.text}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{deal.stage}</span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          {deal.value > 0 && (
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">{formatGBP(deal.value)}</p>
              <p className="text-sm text-muted-foreground">Weighted: {formatGBP(deal.weighted_value || 0)}</p>
            </div>
          )}
          <button onClick={() => setShowEdit(true)} className="p-2 rounded-md border border-input text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors" title="Edit deal">
            <Pencil size={16} />
          </button>
          <button onClick={() => setShowDelete(true)} className="p-2 rounded-md border border-input text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors" title="Delete deal">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Stage Progression Bar */}
      {deal.status === 'open' && (
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-card-foreground">Stage Progression</h2>
            <div className="flex gap-2">
              {currentStageIdx < STAGE_ORDER.length - 1 && (
                <button
                  onClick={() => setStageTarget(STAGE_ORDER[currentStageIdx + 1])}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Advance to {STAGE_ORDER[currentStageIdx + 1]} <ChevronRight size={14} />
                </button>
              )}
              <button
                onClick={() => setStageTarget('Closed Won')}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-health-green/15 text-health-green hover:bg-health-green/25 transition-colors"
              >
                Close Won
              </button>
              <button
                onClick={() => setStageTarget('Closed Lost')}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-health-red/15 text-health-red hover:bg-health-red/25 transition-colors"
              >
                Close Lost
              </button>
            </div>
          </div>
          <div className="flex gap-1">
            {STAGE_ORDER.map((s, i) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  i <= currentStageIdx ? 'bg-primary' : 'bg-muted'
                }`}
                title={s}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">{STAGE_ORDER[0]}</span>
            <span className="text-[10px] text-muted-foreground">{STAGE_ORDER[STAGE_ORDER.length - 1]}</span>
          </div>
        </div>
      )}

      {/* Stage Data Sections */}
      <div className="space-y-4">
        {stagesReached.map(stageName => {
          const fields = STAGE_FIELDS[stageName];
          if (!fields || fields.length === 0) return null;
          const hasData = fields.some(f => {
            const v = getVal(f.key);
            return v !== '' && v !== null && v !== undefined && v !== 0;
          });
          if (!hasData && stageName !== deal.stage) return null;

          return (
            <div key={stageName} className="bg-card rounded-lg border border-border p-5">
              <h2 className="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${stageName === deal.stage ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                {stageName}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {fields.map(f => {
                  let val = getVal(f.key);
                  if (f.type === 'currency' && typeof val === 'number') val = formatGBP(val);
                  if (f.key === 'confidence_percent') val = val ? `${val}%` : '';
                  return <Field key={f.key} label={f.label} value={val} />;
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ownership Split */}
      {dealOwners.length > 1 && (
        <div className="bg-card rounded-lg border border-border p-5">
          <h2 className="text-sm font-semibold text-card-foreground flex items-center gap-1.5 mb-3"><Users size={14} /> Ownership Split</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {dealOwners.map(o => (
              <div key={o.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
                <div>
                  <p className="text-sm font-medium text-card-foreground">{o.user_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{o.role}</p>
                </div>
                <span className="text-lg font-bold text-card-foreground">{o.ownership_percent}%</span>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {dealOwners.map(o => (
              <div key={o.id + '-val'}>
                <p className="text-xs text-muted-foreground">{o.user_name}'s share</p>
                <p className="font-semibold text-card-foreground">{formatGBP(deal.value * o.ownership_percent / 100)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Linked Records */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-border p-5 space-y-3">
          <h2 className="text-sm font-semibold text-card-foreground flex items-center gap-1.5"><Building2 size={14} /> Company</h2>
          <Field label="Name" value={company?.company_name} />
          <Field label="Industry" value={company?.industry} />
          <Field label="Website" value={company?.website} />
        </div>
        <div className="bg-card rounded-lg border border-border p-5 space-y-3">
          <h2 className="text-sm font-semibold text-card-foreground flex items-center gap-1.5"><User size={14} /> Primary Contact</h2>
          <Field label="Name" value={contact?.full_name} />
          <Field label="Title" value={contact?.role_or_title} />
          <Field label="Email" value={contact?.email} />
          <Field label="Phone" value={contact?.phone} />
        </div>
      </div>

      {/* Commercials & Margin */}
      {((deal.estimated_delivery_cost ?? 0) > 0 || deal.value > 0) && (
        <div className="bg-card rounded-lg border border-border p-5">
          <h2 className="text-sm font-semibold text-card-foreground flex items-center gap-1.5 mb-3"><TrendingUp size={14} /> Commercials</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Deal Value" value={formatGBP(deal.value)} />
            <Field label="Est. Delivery Cost" value={(deal.estimated_delivery_cost ?? 0) > 0 ? formatGBP(deal.estimated_delivery_cost!) : '—'} />
            <Field label="Gross Margin £" value={
              (deal.estimated_delivery_cost ?? 0) > 0
                ? <span className={(deal.gross_margin_value ?? 0) >= 0 ? 'text-health-green' : 'text-health-red'}>{formatGBP(deal.gross_margin_value ?? 0)}</span>
                : '—'
            } />
            <Field label="Gross Margin %" value={
              deal.gross_margin_percent != null && (deal.estimated_delivery_cost ?? 0) > 0
                ? <span className={(deal.gross_margin_percent ?? 0) >= 0 ? 'text-health-green' : 'text-health-red'}>{Math.round(deal.gross_margin_percent)}%</span>
                : '—'
            } />
          </div>
        </div>
      )}

      {/* Slippage & Risks (always show if data exists) */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-border p-5 space-y-3">
          <h2 className="text-sm font-semibold text-card-foreground flex items-center gap-1.5"><Calendar size={14} /> Slippage Tracking</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Original Close Date" value={deal.original_close_date} />
            <Field label="Current Close Date" value={deal.latest_close_date} />
            <Field label="Slip Count" value={
              <span className={deal.slip_count >= 2 ? 'text-health-red font-semibold' : ''}>{deal.slip_count}</span>
            } />
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-5 space-y-3">
          <h2 className="text-sm font-semibold text-card-foreground flex items-center gap-1.5"><AlertTriangle size={14} /> Actions & Risks</h2>
          <Field label="Next Action" value={deal.next_action} />
          <Field label="Next Action Date" value={deal.next_action_date} />
          <Field label="Blocker / Risk" value={deal.blocker_or_risk} />
        </div>
      </div>

      {/* Revenue Profile */}
      {monthlyRevenue.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-5">
          <h2 className="text-sm font-semibold text-card-foreground flex items-center gap-1.5 mb-3"><TrendingUp size={14} /> Monthly Revenue Profile</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {monthlyRevenue.map(m => (
              <div key={m.month} className="bg-secondary rounded-md p-3 text-center">
                <p className="text-xs text-muted-foreground">{m.month}</p>
                <p className="text-sm font-semibold text-card-foreground mt-1">{formatGBP(m.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <ActivityTimeline dealId={deal.id} onLogActivity={() => navigate(logActivityUrl)} />

      <ConfirmDeleteModal
        open={showDelete}
        title="Delete Deal"
        description={`"${deal.deal_name}" will be soft-deleted and removed from all views.`}
        warning="This deal will be excluded from pipeline, forecast, and dashboard calculations. You can restore it from the Deleted Items page."
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        loading={deleting}
      />

      {stageTarget && (
        <StageGateModal
          open={!!stageTarget}
          deal={deal}
          targetStage={stageTarget}
          onConfirm={handleStageConfirm}
          onCancel={() => setStageTarget(null)}
          loading={stageLoading}
        />
      )}

      <EditDealModal open={showEdit} deal={deal} onClose={() => setShowEdit(false)} />
    </div>
  );
};

export default DealDetailPage;
