import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useCrm } from '@/context/CrmContext';
import { OWNERS } from '@/context/UserViewContext';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

const AddCompanyModal = ({ open, onClose }: Props) => {
  const { addCompany } = useCrm();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    industry: '',
    website: '',
    notes: '',
    account_owner: '',
  });

  const set = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const reset = () => setForm({ company_name: '', industry: '', website: '', notes: '', account_owner: '' });

  const handleSave = async () => {
    if (!form.company_name.trim()) { toast.error('Company name is required'); return; }
    setSaving(true);
    try {
      await addCompany({
        company_name: form.company_name.trim(),
        industry: form.industry.trim() || null,
        website: form.website.trim() || null,
        notes: form.notes.trim() || null,
        account_owner: form.account_owner || null,
      } as any);
      toast.success('Company created');
      reset();
      onClose();
    } catch {
      toast.error('Failed to create company');
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
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Company</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Field label="Company Name *">
            <Input value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Enter company name" autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Industry">
              <Input value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="e.g. Technology, Finance" />
            </Field>
            <Field label="Account Owner">
              <Select value={form.account_owner || '_none'} onValueChange={v => set('account_owner', v === '_none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Unassigned</SelectItem>
                  {OWNERS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Website">
            <Input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://example.com" />
          </Field>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes about this company" rows={3} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Creating…' : 'Create Company'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddCompanyModal;
