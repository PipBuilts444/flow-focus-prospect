import { useState, useEffect, useCallback, useRef } from 'react';
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
import { formatInputDisplay, stripFormatting, formatGBP } from '@/lib/currency';
import ContactSearchSelect from './ContactSearchSelect';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import OwnershipSplitEditor, { type OwnerEntry } from './OwnershipSplitEditor';

interface Props {
  open: boolean;
  deal: Deal;
  onClose: () => void;
}

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
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
    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1">{title}</h3>
    {children}
  </div>
);

const FormRow = ({ children }: LayoutProps) => (
  <div className="grid grid-cols-2 gap-3">{children}</div>
);

const FormField = ({ label, children }: FormFieldProps) => (
  <div className="space-y-1">
    <Label className="text-xs">{label}</Label>
    {children}
  </div>
);

const EditDealModal = ({ open, deal, onClose }: Props) => {
  const { updateDeal, updateContact, updateCompany, companies, getContact, getCompany } = useCrm();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [contactForm, setContactForm] = useState<Record<string, any>>({});
  const [companyForm, setCompanyForm] = useState<Record<string, any>>({});
  const [valueDisplay, setValueDisplay] = useState('');
  const [deliveryCostDisplay, setDeliveryCostDisplay] = useState('');
  const [ownershipSplit, setOwnershipSplit] = useState<OwnerEntry[]>([]);

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
      won_date: deal.won_date || '',
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
      lost_date: deal.lost_date || '',
      estimated_delivery_cost: deal.estimated_delivery_cost || 0,
    });
    setValueDisplay(deal.value > 0 ? formatInputDisplay(String(deal.value)) : '');
    setDeliveryCostDisplay(deal.estimated_delivery_cost && deal.estimated_delivery_cost > 0 ? formatInputDisplay(String(deal.estimated_delivery_cost)) : '');

    // Load linked contact
    const contact = deal.primary_contact_id ? getContact(deal.primary_contact_id) : null;
    setContactForm({
      first_name: contact?.first_name || '',
      last_name: contact?.last_name || '',
      email: contact?.email || '',
      phone: contact?.phone || '',
      role_or_title: contact?.role_or_title || '',
    });

    // Load linked company
    const company = deal.company_id ? getCompany(deal.company_id) : null;
    setCompanyForm({
      company_name: company?.company_name || '',
      industry: company?.industry || '',
      website: company?.website || '',
    });

    // Load ownership records
    supabase.from('deal_owners').select('*').eq('deal_id', deal.id).order('role').then(({ data, error }) => {
      if (error) {
        console.error('Failed to load deal owners:', error);
      }
      if (data && data.length > 0) {
        setOwnershipSplit(data.map((o: any) => ({ user_name: o.user_name, ownership_percent: o.ownership_percent, role: o.role })));
      } else if (deal.owner) {
        setOwnershipSplit([{ user_name: deal.owner, ownership_percent: 100, role: 'primary' }]);
      } else {
        setOwnershipSplit([]);
      }
    });
  }, [open, deal.id]);

  // When contact selection changes, reload contact fields
  const handleContactChange = useCallback((contactId: string | null) => {
    setForm((prev) => ({ ...prev, primary_contact_id: contactId || '' }));
    if (contactId) {
      const contact = getContact(contactId);
      setContactForm({
        first_name: contact?.first_name || '',
        last_name: contact?.last_name || '',
        email: contact?.email || '',
        phone: contact?.phone || '',
        role_or_title: contact?.role_or_title || '',
      });
    } else {
      setContactForm({ first_name: '', last_name: '', email: '', phone: '', role_or_title: '' });
    }
  }, [getContact]);

  // When company selection changes, reload company fields
  const handleCompanyChange = useCallback((companyId: string) => {
    const resolved = companyId === '_none' ? '' : companyId;
    setForm((prev) => ({ ...prev, company_id: resolved }));
    if (resolved) {
      const company = getCompany(resolved);
      setCompanyForm({
        company_name: company?.company_name || '',
        industry: company?.industry || '',
        website: company?.website || '',
      });
    } else {
      setCompanyForm({ company_name: '', industry: '', website: '' });
    }
  }, [getCompany]);

  const setField = (key: string, val: any) => setForm((prev) => ({ ...prev, [key]: val }));
  const setContactField = (key: string, val: string) => setContactForm((prev) => ({ ...prev, [key]: val }));
  const setCompanyField = (key: string, val: string) => setCompanyForm((prev) => ({ ...prev, [key]: val }));

  const handleValueChange = (raw: string) => {
    const cleaned = stripFormatting(raw);
    const num = parseFloat(cleaned) || 0;
    setValueDisplay(formatInputDisplay(cleaned));
    setField('value', num);
  };

  const handleDeliveryCostChange = (raw: string) => {
    const cleaned = stripFormatting(raw);
    const num = parseFloat(cleaned) || 0;
    setDeliveryCostDisplay(formatInputDisplay(cleaned));
    setField('estimated_delivery_cost', num);
  };

  // Auto-calculated margin fields
  const grossMarginValue = (form.value || 0) - (form.estimated_delivery_cost || 0);
  const grossMarginPercent = (form.value || 0) > 0 ? (grossMarginValue / form.value) * 100 : 0;

  const handleSave = async () => {
    if (!form.deal_name?.trim()) {
      toast.error('Deal name is required');
      return;
    }

    if (form.stage === 'Closed Won' && !form.won_date) {
      toast.error('Won date is required for Closed Won deals');
      return;
    }

    setSaving(true);
    try {
      // 1. Update deal with computed margin fields
      const updates: Record<string, any> = {
        ...form,
        gross_margin_value: grossMarginValue,
        gross_margin_percent: Math.round(grossMarginPercent * 100) / 100,
      };
      delete updates.weighted_value;
      if (!updates.company_id) updates.company_id = null;
      if (!updates.primary_contact_id) updates.primary_contact_id = null;
      if (!updates.expected_close_date) updates.expected_close_date = null;
      if (!updates.expected_start_date) updates.expected_start_date = null;
      if (!updates.won_date) updates.won_date = null;
      if (!updates.lost_date) updates.lost_date = null;
      if (!updates.next_action_date) updates.next_action_date = null;
      await updateDeal(deal.id, updates);

      // 2. Update linked contact if one is selected and fields were touched
      if (form.primary_contact_id && contactForm.first_name?.trim()) {
        const firstName = contactForm.first_name.trim();
        const lastName = contactForm.last_name?.trim() || '';
        await updateContact(form.primary_contact_id, {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`.trim(),
          email: contactForm.email?.trim() || null,
          phone: contactForm.phone?.trim() || null,
          role_or_title: contactForm.role_or_title?.trim() || null,
        } as any);
      }

      // 3. Update linked company if one is selected and fields were touched
      if (form.company_id) {
        await updateCompany(form.company_id, {
          company_name: companyForm.company_name?.trim() || undefined,
          industry: companyForm.industry?.trim() || null,
          website: companyForm.website?.trim() || null,
        } as any);
      }

      // 4. Save ownership split
      if (ownershipSplit.length > 0) {
        const total = ownershipSplit.reduce((s, o) => s + o.ownership_percent, 0);
        if (total !== 100) { toast.error('Ownership split must total 100%'); setSaving(false); return; }
        await supabase.from('deal_owners').delete().eq('deal_id', deal.id);
        await supabase.from('deal_owners').insert(ownershipSplit.map(o => ({ deal_id: deal.id, ...o })));
      }

      toast.success('Deal updated');
      onClose();
    } catch {
      toast.error('Failed to update deal');
    } finally {
      setSaving(false);
    }
  };

  const activeCompanies = companies.filter((c) => !c.is_deleted);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Edit Deal</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2 overflow-y-auto flex-1 min-h-0 pr-1">
          {/* ── Deal Details ── */}
          <FormSection title="Deal Details">
            <FormField label="Deal Name">
              <Input value={form.deal_name || ''} onChange={(e) => setField('deal_name', e.target.value)} placeholder="Enter deal name" />
            </FormField>
            <FormRow>
              <FormField label="Primary Owner">
                <Select value={form.owner || '_none'} onValueChange={(v) => {
                  const name = v === '_none' ? '' : v;
                  setField('owner', name);
                  if (name && ownershipSplit.length === 0) {
                    setOwnershipSplit([{ user_name: name, ownership_percent: 100, role: 'primary' }]);
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Unassigned</SelectItem>
                    {OWNERS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Source">
                <Input value={form.source || ''} onChange={(e) => setField('source', e.target.value)} placeholder="Referral, Inbound…" />
              </FormField>
            </FormRow>
            {ownershipSplit.length > 0 && (
              <FormField label="Ownership Split">
                <OwnershipSplitEditor value={ownershipSplit} onChange={setOwnershipSplit} />
              </FormField>
            )}
            <FormRow>
              <FormField label="Stage">
                <Select value={form.stage} onValueChange={(v) => setField('stage', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEAL_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Deal Type">
                <Select value={form.deal_type} onValueChange={(v) => setField('deal_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEAL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
            </FormRow>
          </FormSection>

          {/* ── Contact Details ── */}
          <FormSection title="Primary Contact">
            <FormField label="Contact">
              <ContactSearchSelect
                value={form.primary_contact_id || null}
                companyId={form.company_id || null}
                onChange={handleContactChange}
              />
            </FormField>
            {form.primary_contact_id && (
              <>
                <FormRow>
                  <FormField label="First Name">
                    <Input value={contactForm.first_name || ''} onChange={(e) => setContactField('first_name', e.target.value)} />
                  </FormField>
                  <FormField label="Last Name">
                    <Input value={contactForm.last_name || ''} onChange={(e) => setContactField('last_name', e.target.value)} />
                  </FormField>
                </FormRow>
                <FormRow>
                  <FormField label="Job Title / Role">
                    <Input value={contactForm.role_or_title || ''} onChange={(e) => setContactField('role_or_title', e.target.value)} />
                  </FormField>
                  <FormField label="Email">
                    <Input type="email" value={contactForm.email || ''} onChange={(e) => setContactField('email', e.target.value)} />
                  </FormField>
                </FormRow>
                <FormField label="Phone">
                  <Input value={contactForm.phone || ''} onChange={(e) => setContactField('phone', e.target.value)} />
                </FormField>
              </>
            )}
          </FormSection>

          {/* ── Company Details ── */}
          <FormSection title="Company">
            <FormField label="Company">
              <Select value={form.company_id || '_none'} onValueChange={handleCompanyChange}>
                <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No company</SelectItem>
                  {activeCompanies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            {form.company_id && (
              <FormRow>
                <FormField label="Industry">
                  <Input value={companyForm.industry || ''} onChange={(e) => setCompanyField('industry', e.target.value)} />
                </FormField>
                <FormField label="Website">
                  <Input value={companyForm.website || ''} onChange={(e) => setCompanyField('website', e.target.value)} placeholder="https://..." />
                </FormField>
              </FormRow>
            )}
          </FormSection>

          {/* ── Commercial / Forecast ── */}
          <FormSection title="Commercial & Forecast">
            <FormRow>
              <FormField label="Forecast Category">
                <Select value={form.forecast_category} onValueChange={(v) => setField('forecast_category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FORECAST_CATEGORIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Confidence (%)">
                <Input type="number" min={0} max={100} value={form.confidence_percent ?? ''} onChange={(e) => setField('confidence_percent', parseInt(e.target.value) || 0)} />
              </FormField>
            </FormRow>
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
            {(form.stage === 'Closed Won' || form.won_date) && (
              <FormField label="Won Date">
                <Input type="date" value={form.won_date || ''} onChange={(e) => setField('won_date', e.target.value)} />
              </FormField>
            )}
            {(form.stage === 'Closed Lost' || form.lost_reason) && (
              <FormField label="Lost Date">
                <Input type="date" value={form.lost_date || ''} onChange={(e) => setField('lost_date', e.target.value)} />
              </FormField>
            )}
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

          {/* ── Delivery Cost & Margin ── */}
          <FormSection title="Delivery Cost & Margin">
            <FormField label="Estimated Delivery Cost">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">£</span>
                <Input
                  className="pl-7"
                  value={deliveryCostDisplay.replace('£', '')}
                  onChange={(e) => handleDeliveryCostChange(e.target.value)}
                  placeholder="0"
                />
              </div>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary/50 rounded-md p-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase">Gross Margin £</p>
                <p className={`text-sm font-semibold mt-0.5 ${grossMarginValue >= 0 ? 'text-health-green' : 'text-health-red'}`}>{formatGBP(grossMarginValue)}</p>
              </div>
              <div className="bg-secondary/50 rounded-md p-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase">Gross Margin %</p>
                <p className={`text-sm font-semibold mt-0.5 ${grossMarginPercent >= 0 ? 'text-health-green' : 'text-health-red'}`}>{Math.round(grossMarginPercent)}%</p>
              </div>
            </div>
          </FormSection>

          {/* ── Problem & Discovery ── */}
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

          {/* ── Actions, Risks & Notes ── */}
          <FormSection title="Actions, Risks & Notes">
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
