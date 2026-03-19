import { useParams, useNavigate } from 'react-router-dom';
import { useCrm } from '@/context/CrmContext';
import { ArrowLeft, Building2, User, Calendar, AlertTriangle, TrendingUp } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { formatGBP } from '@/lib/currency';

const healthLabel: Record<string, { text: string; cls: string }> = {
  green: { text: 'Healthy', cls: 'bg-health-green/15 text-health-green' },
  amber: { text: 'At Risk', cls: 'bg-health-amber/15 text-health-amber' },
  red: { text: 'Critical', cls: 'bg-health-red/15 text-health-red' },
};

const DealDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getDeal, getCompany, getContact, getDealHealth } = useCrm();

  const deal = getDeal(id || '');
  if (!deal) return <div className="p-6"><p className="text-muted-foreground">Deal not found</p></div>;

  const company = getCompany(deal.company_id || '');
  const contact = getContact(deal.primary_contact_id || '');
  const health = getDealHealth(deal);
  const hl = healthLabel[health];

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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{deal.deal_name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-muted-foreground">{company?.company_name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${hl.cls}`}>{hl.text}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{deal.stage}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">{formatGBP(deal.value)}</p>
          <p className="text-sm text-muted-foreground">Weighted: {formatGBP(deal.weighted_value || 0)}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-card-foreground">Deal Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Owner" value={deal.owner} />
            <Field label="Deal Type" value={deal.deal_type} />
            <Field label="Forecast Category" value={deal.forecast_category} />
            <Field label="Confidence" value={`${deal.confidence_percent}%`} />
            <Field label="Expected Close" value={deal.expected_close_date} />
            <Field label="Expected Start" value={deal.expected_start_date} />
            <Field label="Duration" value={`${deal.delivery_duration_months} months`} />
            <Field label="Source" value={deal.source} />
            <Field label="Status" value={deal.status.replace('_', ' ')} />
            {deal.status === 'closed_lost' && <Field label="Lost Reason" value={deal.lost_reason} />}
          </div>
        </div>

        <div className="space-y-4">
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
      </div>

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
          <Field label="Notes" value={deal.notes} />
        </div>
      </div>

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
    </div>
  );
};

export default DealDetailPage;
