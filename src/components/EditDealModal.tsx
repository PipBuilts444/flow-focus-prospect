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
import { formatGBP, formatInputDisplay, stripFormatting } from '@/lib/currency';
import ContactSearchSelect from './ContactSearchSelect';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  deal: Deal;
  onClose: () => void;
}

const EditDealModal = ({ open, deal, onClose }: Props) => {
  const { updateDeal, companies } = useCrm();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [valueDisplay, setValueDisplay] = useState('');

  useEffect(() => {
    if (open) {
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
    }
  }, [open, deal]);

  const set = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  const handleValueChange = (raw: string) => {
    const cleaned = stripFormatting(raw);
    const num = parseFloat(cleaned) || 0;
    setValueDisplay(formatInputDisplay(cleaned));
    set('value', num);
  };

  const handleSave = async () => {
    if (!form.deal_name?.trim()) { toast.error('Deal name is required'); return; }
    setSaving(true);
    try {
      const updates: Record<string, any> = { ...form };
      // Don't send weighted_value - it's computed
      delete updates.weighted_value;
      // Clean empty strings to null for optional FK fields
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

  const activeCompanies = companies.filter(c => !c.is_deleted);

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );

  const Row = ({ children }: { children: React.ReactNode }) => (
    <div className="grid grid-cols-2 gap-3">{children}</div>
  );

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Deal</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Core info */}
          <Section title="Core Details">
            <Field label="Deal Name">
              <Input value={form.deal_name || ''} onChange={e => set('deal_name', e.target.value)} placeholder="Enter deal name" />
            </Field>
            <Row>
              <Field label="Company">
                <Select value={form.company_id || '_none'} onValueChange={v => set('company_id', v === '_none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">No company</SelectItem>
                    {activeCompanies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Primary Contact">
                <ContactSearchSelect
                  value={form.primary_contact_id || null}
                  companyId={form.company_id || null}
                  onChange={id => set('primary_contact_id', id || '')}
                />
              </Field>
            </Row>
            <Row>
              <Field label="Owner">
                <Select value={form.owner || '_none'} onValueChange={v => set('owner', v === '_none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Unassigned</SelectItem>
                    {OWNERS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Source">
                <Input value={form.source || ''} onChange={e => set('source', e.target.value)} placeholder="Referral, Inbound…" />
              </Field>
            </Row>
          </Section>

          {/* Classification */}
          <Section title="Classification">
            <Row>
              <Field label="Stage">
                <Select value={form.stage} onValueChange={v => set('stage', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEAL_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Deal Type">
                <Select value={form.deal_type} onValueChange={v => set('deal_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEAL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </Row>
            <Row>
              <Field label="Forecast Category">
                <Select value={form.forecast_category} onValueChange={v => set('forecast_category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FORECAST_CATEGORIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Confidence (%)">
                <Input type="number" min={0} max={100} value={form.confidence_percent ?? ''} onChange={e => set('confidence_percent', parseInt(e.target.value) || 0)} />
              </Field>
            </Row>
          </Section>

          {/* Financials & Dates */}
          <Section title="Financials & Dates">
            <Row>
              <Field label="Value">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">£</span>
                  <Input
                    className="pl-7"
                    value={valueDisplay.replace('£', '')}
                    onChange={e => handleValueChange(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </Field>
              <Field label="Delivery Duration (months)">
                <Input type="number" min={1} value={form.delivery_duration_months ?? 1} onChange={e => set('delivery_duration_months', parseInt(e.target.value) || 1)} />
              </Field>
            </Row>
            <Row>
              <Field label="Expected Close Date">
                <Input type="date" value={form.expected_close_date || ''} onChange={e => set('expected_close_date', e.target.value)} />
              </Field>
              <Field label="Expected Start Date">
                <Input type="date" value={form.expected_start_date || ''} onChange={e => set('expected_start_date', e.target.value)} />
              </Field>
            </Row>
          </Section>

          {/* Problem & Discovery */}
          <Section title="Problem & Discovery">
            <Field label="Problem / Challenge">
              <Textarea value={form.problem_challenge || ''} onChange={e => set('problem_challenge', e.target.value)} placeholder="What problem is the client facing?" rows={2} />
            </Field>
            <Row>
              <Field label="Urgency / Why Now">
                <Textarea value={form.urgency_why_now || ''} onChange={e => set('urgency_why_now', e.target.value)} placeholder="Why is this important now?" rows={2} />
              </Field>
              <Field label="Key Stakeholder">
                <Input value={form.key_stakeholder || ''} onChange={e => set('key_stakeholder', e.target.value)} placeholder="Decision maker" />
              </Field>
            </Row>
            <Field label="Refined Problem">
              <Textarea value={form.refined_problem || ''} onChange={e => set('refined_problem', e.target.value)} placeholder="Refined understanding" rows={2} />
            </Field>
            <Row>
              <Field label="Scope Hypothesis">
                <Textarea value={form.scope_hypothesis || ''} onChange={e => set('scope_hypothesis', e.target.value)} rows={2} />
              </Field>
              <Field label="Likely Service Area">
                <Input value={form.likely_service_area || ''} onChange={e => set('likely_service_area', e.target.value)} />
              </Field>
            </Row>
            <Field label="Delivery Considerations">
              <Textarea value={form.delivery_considerations || ''} onChange={e => set('delivery_considerations', e.target.value)} rows={2} />
            </Field>
          </Section>

          {/* Actions & Risks */}
          <Section title="Actions & Risks">
            <Row>
              <Field label="Next Action">
                <Input value={form.next_action || ''} onChange={e => set('next_action', e.target.value)} placeholder="e.g. Schedule follow-up" />
              </Field>
              <Field label="Next Action Date">
                <Input type="date" value={form.next_action_date || ''} onChange={e => set('next_action_date', e.target.value)} />
              </Field>
            </Row>
            <Field label="Blocker / Risk">
              <Textarea value={form.blocker_or_risk || ''} onChange={e => set('blocker_or_risk', e.target.value)} placeholder="What could stop this?" rows={2} />
            </Field>
          </Section>

          {/* Commercial */}
          <Section title="Commercial & Procurement">
            <Row>
              <Field label="Procurement Status">
                <Input value={form.procurement_status || ''} onChange={e => set('procurement_status', e.target.value)} />
              </Field>
              <Field label="Commit Confidence">
                <Input value={form.commit_confidence || ''} onChange={e => set('commit_confidence', e.target.value)} />
              </Field>
            </Row>
            <Field label="Commercial Notes">
              <Textarea value={form.commercial_notes || ''} onChange={e => set('commercial_notes', e.target.value)} rows={2} />
            </Field>
            <Row>
              <Field label="Likely Start Month">
                <Input value={form.likely_start_month || ''} onChange={e => set('likely_start_month', e.target.value)} placeholder="e.g. March 2026" />
              </Field>
              <Field label="Final Commercial Assumptions">
                <Textarea value={form.final_commercial_assumptions || ''} onChange={e => set('final_commercial_assumptions', e.target.value)} rows={2} />
              </Field>
            </Row>
          </Section>

          {/* Notes & Closure */}
          <Section title="Notes">
            <Field label="General Notes">
              <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={3} />
            </Field>
            <Row>
              <Field label="Lost Reason">
                <Input value={form.lost_reason || ''} onChange={e => set('lost_reason', e.target.value)} />
              </Field>
              <Field label="Lost Notes">
                <Textarea value={form.lost_notes || ''} onChange={e => set('lost_notes', e.target.value)} rows={2} />
              </Field>
            </Row>
          </Section>
        </div>

        <DialogFooter>
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
