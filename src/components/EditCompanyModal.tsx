import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useCrm } from '@/context/CrmContext';
import { OWNERS } from '@/context/UserViewContext';
import type { Company } from '@/types/crm';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  company: Company;
  onClose: () => void;
}

const EditCompanyModal = ({ open, company, onClose }: Props) => {
  const { updateCompany } = useCrm();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    industry: '',
    website: '',
    notes: '',
    account_owner: '',
    status: 'prospect' as string,
  });

  useEffect(() => {
    if (open) {
      setForm({
        company_name: company.company_name || '',
        industry: company.industry || '',
        website: company.website || '',
        notes: company.notes || '',
        account_owner: company.account_owner || '',
        status: company.status || 'prospect',
      });
    }
  }, [open, company]);

  const set = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!form.company_name.trim()) { toast.error('Company name is required'); return; }
    setSaving(true);
    try {
      await updateCompany(company.id, {
        company_name: form.company_name.trim(),
        industry: form.industry.trim() || null,
        website: form.website.trim() || null,
        notes: form.notes.trim() || null,
        account_owner: form.account_owner || null,
        status: form.status as any,
      } as any);
      toast.success('Company updated');
      onClose();
    } catch {
      toast.error('Failed to update company');
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Company</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Field label="Company Name *">
            <Input value={form.company_name} onChange={e => set('company_name', e.target.value)} autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Industry">
              <Input value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="e.g. Technology" />
            </Field>
            <Field label="Website">
              <Input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Account Owner">
              <Select value={form.account_owner || '_none'} onValueChange={v => set('account_owner', v === '_none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No owner</SelectItem>
                  {OWNERS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditCompanyModal;
