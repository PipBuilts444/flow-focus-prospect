import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useCrm } from '@/context/CrmContext';
import { OWNERS } from '@/context/UserViewContext';
import { DEAL_STAGES, FORECAST_CATEGORIES, DEAL_TYPES } from '@/types/crm';
import type { Deal } from '@/types/crm';
import { formatInputDisplay, stripFormatting } from '@/lib/currency';
import ContactSearchSelect from './ContactSearchSelect';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  deal: Deal;
  onClose: () => void;
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

interface LayoutProps {
  children: React.ReactNode;
}

const FormSection = ({ title, children }: SectionProps) => (
  <div className="space-y-3">
    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
    {children}
  </div>
);

const FormRow = ({ children }: LayoutProps) => (
  <div className="grid grid-cols-2 gap-3">{children}</div>
);

const FormField = ({ label, children }: SectionProps) => (
  <div className="space-y-1">
    <Label className="text-xs">{label}</Label>
    {children}
  </div>
);

const EditDealModal = ({ open, deal, onClose }: Props) => {
  const { updateDeal, companies } = useCrm();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [valueDisplay, setValueDisplay] = useState('');

  useEffect(() => {
    if (!open) return;

    setForm({
      deal_name: deal.deal_name,
      company_id: deal.company_id || '',
      primary_contact_id: deal.primary_contact_id || '',
      owner: deal.owner || '',
      stage: deal.stage,
      forecast_category: deal.forecast_category,
      deal_type: deal.deal_type,
      value: deal.value,
      confidence_percent: deal.confidence_percent,
      expected_close_date: deal.expected_close_date || '',
      expected_start_date: deal.expected_start_date || '',
      delivery_duration_months: deal.delivery_duration_months,
      problem_challenge: deal.problem_challenge || '',
      notes: deal.notes || '',
      next_action: deal.next_action || '',
      next_action_date: deal.next_action_date || '',
      blocker_or_risk: deal.blocker_or_risk || '',
      source: deal.source || '',
      key_stakeholder: deal.key_stakeholder || '',
      urgency_why_now: deal.urgency_why_now || '',
      refined_problem: deal.refined_problem || '',
      scope_hypothesis: deal.scope_hypothesis || '',
      likely_service_area: deal.likely_service_area || '',
      delivery_considerations: deal.delivery_considerations || '',
      procurement_status: deal.procurement_status || '',
      commercial_notes: deal.commercial_notes || '',
      commit_confidence: deal.commit_confidence || '',
      likely_start_month: deal.likely_start_month || '',
      final_commercial_assumptions: deal.final_commercial_assumptions || '',
      lost_reason: deal.lost_reason || '',
      lost_notes: deal.lost_notes || '',
    });
    setValueDisplay(deal.value > 0 ? formatInputDisplay(String(deal.value)) : '');
  }, [open, deal.id]);

  const setField = (key: string, val: any) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleValueChange = (raw: string) => {
    const cleaned = stripFormatting(raw);
    const num = parseFloat(cleaned) || 0;
    setValueDisplay(formatInputDisplay(cleaned));
    setField('value', num);
  };

  const handleSave = async () => {
    if (!form.deal_name?.trim()) {
      toast.error('Deal name is required');
      return;
    }

    setSaving(true);
    try {
      const updates: Record<string, any> = { ...form };
      delete updates.weighted_value;

      if (!updates.company_id) updates.company_id = null;
      if (!updates.primary_contact_id) updates.primary_contact_id = null;
      if (!updates.expected_close_date) updates.expected_close_date = null;
      if (!updates.expected_start_date) updates.expected_start_date = null;
      if (!updates.next_action_date) updates.next_action_date = null;

      await updateDeal(deal.id, updates);
      toast.success('Deal updated');
      onClose();
    } catch {
      toast.error('Failed to update deal');
    } finally {
      setSaving(false);
    }
  };

  const activeCompanies = companies.filter((company) => !company.is_deleted);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Edit Deal</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2 overflow-y-auto flex-1 min-h-0">
          <FormSection title="Core Details">
            <FormField label="Deal Name">
              <Input value={form.deal_name || ''} onChange={(e) => setField('deal_name', e.target.value)} placeholder="Enter deal name" />
            </FormField>
            <FormRow>
              <FormField label="Company">
                <Select value={form.company_id || '_none'} onValueChange={(value) => setField('company_id', value === '_none' ? '' : value)}>
                  <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">No company</SelectItem>
                    {activeCompanies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>{company.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Primary Contact">
                <ContactSearchSelect
                  value={form.primary_contact_id || null}
                  companyId={form.company_id || null}
                  onChange={(id) => setField('primary_contact_id', id || '')}
                />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="Owner">
                <Select value={form.owner || '_none'} onValueChange={(value) => setField('owner', value === '_none' ? '' : value)}>
                  <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Unassigned</SelectItem>
                    {OWNERS.map((owner) => <SelectItem key={owner} value={owner}>{owner}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Source">
                <Input value={form.source || ''} onChange={(e) => setField('source', e.target.value)} placeholder="Referral, Inbound…" />
              </FormField>
            </FormRow>
          </FormSection>

          <FormSection title="Classification">
            <FormRow>
              <FormField label="Stage">
                <Select value={form.stage} onValueChange={(value) => setField('stage', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEAL_STAGES.map((stage) => <SelectItem key={stage} value={stage}>{stage}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Deal Type">
                <Select value={form.deal_type} onValueChange={(value) => setField('deal_type', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEAL_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="Forecast Category">
                <Select value={form.forecast_category} onValueChange={(value) => setField('forecast_category', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FORECAST_CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Confidence (%)">
                <Input type="number" min={0} max={100} value={form.confidence_percent ?? ''} onChange={(e) => setField('confidence_percent', parseInt(e.target.value) || 0)} />
              </FormField>
            </FormRow>
          </FormSection>

          <FormSection title="Financials & Dates">
            <FormRow>
              <FormField label="Value">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">£</span>
                  <Input
                    className="pl-7"
                    value={valueDisplay.replace('£', '')}
                    onChange={(e) => handleValueChange(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </FormField>
              <FormField label="Delivery Duration (months)">
                <Input type="number" min={1} value={form.delivery_duration_months ?? 1} onChange={(e) => setField('delivery_duration_months', parseInt(e.target.value) || 1)} />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="Expected Close Date">
                <Input type="date" value={form.expected_close_date || ''} onChange={(e) => setField('expected_close_date', e.target.value)} />
              </FormField>
              <FormField label="Expected Start Date">
                <Input type="date" value={form.expected_start_date || ''} onChange={(e) => setField('expected_start_date', e.target.value)} />
              </FormField>
            </FormRow>
          </FormSection>

          <FormSection title="Problem & Discovery">
            <FormField label="Problem / Challenge">
              <Textarea value={form.problem_challenge || ''} onChange={(e) => setField('problem_challenge', e.target.value)} placeholder="What problem is the client facing?" rows={2} />
            </FormField>
            <FormRow>
              <FormField label="Urgency / Why Now">
                <Textarea value={form.urgency_why_now || ''} onChange={(e) => setField('urgency_why_now', e.target.value)} placeholder="Why is this important now?" rows={2} />
              </FormField>
              <FormField label="Key Stakeholder">
                <Input value={form.key_stakeholder || ''} onChange={(e) => setField('key_stakeholder', e.target.value)} placeholder="Decision maker" />
              </FormField>
            </FormRow>
            <FormField label="Refined Problem">
              <Textarea value={form.refined_problem || ''} onChange={(e) => setField('refined_problem', e.target.value)} placeholder="Refined understanding" rows={2} />
            </FormField>
            <FormRow>
              <FormField label="Scope Hypothesis">
                <Textarea value={form.scope_hypothesis || ''} onChange={(e) => setField('scope_hypothesis', e.target.value)} rows={2} />
              </FormField>
              <FormField label="Likely Service Area">
                <Input value={form.likely_service_area || ''} onChange={(e) => setField('likely_service_area', e.target.value)} />
              </FormField>
            </FormRow>
            <FormField label="Delivery Considerations">
              <Textarea value={form.delivery_considerations || ''} onChange={(e) => setField('delivery_considerations', e.target.value)} rows={2} />
            </FormField>
          </FormSection>

          <FormSection title="Actions & Risks">
            <FormRow>
              <FormField label="Next Action">
                <Input value={form.next_action || ''} onChange={(e) => setField('next_action', e.target.value)} placeholder="e.g. Schedule follow-up" />
              </FormField>
              <FormField label="Next Action Date">
                <Input type="date" value={form.next_action_date || ''} onChange={(e) => setField('next_action_date', e.target.value)} />
              </FormField>
            </FormRow>
            <FormField label="Blocker / Risk">
              <Textarea value={form.blocker_or_risk || ''} onChange={(e) => setField('blocker_or_risk', e.target.value)} placeholder="What could stop this?" rows={2} />
            </FormField>
          </FormSection>

          <FormSection title="Commercial & Procurement">
            <FormRow>
              <FormField label="Procurement Status">
                <Input value={form.procurement_status || ''} onChange={(e) => setField('procurement_status', e.target.value)} />
              </FormField>
              <FormField label="Commit Confidence">
                <Input value={form.commit_confidence || ''} onChange={(e) => setField('commit_confidence', e.target.value)} />
              </FormField>
            </FormRow>
            <FormField label="Commercial Notes">
              <Textarea value={form.commercial_notes || ''} onChange={(e) => setField('commercial_notes', e.target.value)} rows={2} />
            </FormField>
            <FormRow>
              <FormField label="Likely Start Month">
                <Input value={form.likely_start_month || ''} onChange={(e) => setField('likely_start_month', e.target.value)} placeholder="e.g. March 2026" />
              </FormField>
              <FormField label="Final Commercial Assumptions">
                <Textarea value={form.final_commercial_assumptions || ''} onChange={(e) => setField('final_commercial_assumptions', e.target.value)} rows={2} />
              </FormField>
            </FormRow>
          </FormSection>

          <FormSection title="Notes">
            <FormField label="General Notes">
              <Textarea value={form.notes || ''} onChange={(e) => setField('notes', e.target.value)} rows={3} />
            </FormField>
            <FormRow>
              <FormField label="Lost Reason">
                <Input value={form.lost_reason || ''} onChange={(e) => setField('lost_reason', e.target.value)} />
              </FormField>
              <FormField label="Lost Notes">
                <Textarea value={form.lost_notes || ''} onChange={(e) => setField('lost_notes', e.target.value)} rows={2} />
              </FormField>
            </FormRow>
          </FormSection>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditDealModal;
