import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useCrm } from '@/context/CrmContext';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

const AddContactModal = ({ open, onClose }: Props) => {
  const { addContact, companies } = useCrm();
  const [saving, setSaving] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role_or_title: '',
    company_id: '',
    notes: '',
  });

  const set = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const reset = () => {
    setForm({ first_name: '', last_name: '', email: '', phone: '', role_or_title: '', company_id: '', notes: '' });
    setCompanySearch('');
  };

  const handleSave = async () => {
    if (!form.first_name.trim()) { toast.error('First name is required'); return; }
    if (!form.last_name.trim()) { toast.error('Last name is required'); return; }
    setSaving(true);
    try {
      await addContact({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        role_or_title: form.role_or_title.trim() || null,
        company_id: form.company_id || null,
        notes: form.notes.trim() || null,
      } as any);
      toast.success('Contact created');
      reset();
      onClose();
    } catch {
      toast.error('Failed to create contact');
    } finally {
      setSaving(false);
    }
  };

  const activeCompanies = companies.filter(c => !c.is_deleted);
  const filteredCompanies = companySearch
    ? activeCompanies.filter(c => c.company_name.toLowerCase().includes(companySearch.toLowerCase()))
    : activeCompanies;

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
          <DialogTitle>Add Contact</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name *">
              <Input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First name" autoFocus />
            </Field>
            <Field label="Last Name *">
              <Input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last name" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="name@company.com" />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+44 7700 900000" />
            </Field>
          </div>
          <Field label="Role / Title">
            <Input value={form.role_or_title} onChange={e => set('role_or_title', e.target.value)} placeholder="e.g. CTO, Head of Product" />
          </Field>
          <Field label="Company (optional)">
            <Select value={form.company_id || '_none'} onValueChange={v => set('company_id', v === '_none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1.5">
                  <Input
                    placeholder="Search companies…"
                    value={companySearch}
                    onChange={e => setCompanySearch(e.target.value)}
                    className="h-8 text-xs"
                    onClick={e => e.stopPropagation()}
                  />
                </div>
                <SelectItem value="_none">No company</SelectItem>
                {filteredCompanies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes about this contact" rows={3} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Creating…' : 'Create Contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddContactModal;
