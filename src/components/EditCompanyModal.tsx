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

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
}

const FormField = ({ label, children }: FormFieldProps) => (
  <div className="space-y-1">
    <Label className="text-xs">{label}</Label>
    {children}
  </div>
);

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
    if (!open) return;

    setForm({
      company_name: company.company_name || '',
      industry: company.industry || '',
      website: company.website || '',
      notes: company.notes || '',
      account_owner: company.account_owner || '',
      status: company.status || 'prospect',
    });
  }, [open, company.id]);

  const setField = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.company_name.trim()) {
      toast.error('Company name is required');
      return;
    }

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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Edit Company</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 overflow-y-auto flex-1 min-h-0">
          <FormField label="Company Name *">
            <Input value={form.company_name} onChange={(e) => setField('company_name', e.target.value)} autoFocus />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Industry">
              <Input value={form.industry} onChange={(e) => setField('industry', e.target.value)} placeholder="e.g. Technology" />
            </FormField>
            <FormField label="Website">
              <Input value={form.website} onChange={(e) => setField('website', e.target.value)} placeholder="https://..." />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Account Owner">
              <Select value={form.account_owner || '_none'} onValueChange={(value) => setField('account_owner', value === '_none' ? '' : value)}>
                <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No owner</SelectItem>
                  {OWNERS.map((owner) => <SelectItem key={owner} value={owner}>{owner}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Status">
              <Select value={form.status} onValueChange={(value) => setField('status', value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField label="Notes">
            <Textarea value={form.notes} onChange={(e) => setField('notes', e.target.value)} rows={3} />
          </FormField>
        </div>
        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditCompanyModal;
