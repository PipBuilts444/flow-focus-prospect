import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useCrm } from '@/context/CrmContext';
import type { Contact } from '@/types/crm';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  contact: Contact;
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

const EditContactModal = ({ open, contact, onClose }: Props) => {
  const { updateContact, companies } = useCrm();
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

  useEffect(() => {
    if (!open) return;

    setForm({
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      role_or_title: contact.role_or_title || '',
      company_id: contact.company_id || '',
      notes: contact.notes || '',
    });
    setCompanySearch('');
  }, [open, contact.id]);

  const setField = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.first_name.trim()) {
      toast.error('First name is required');
      return;
    }
    if (!form.last_name.trim()) {
      toast.error('Last name is required');
      return;
    }

    setSaving(true);
    try {
      await updateContact(contact.id, {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        full_name: `${form.first_name.trim()} ${form.last_name.trim()}`.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        role_or_title: form.role_or_title.trim() || null,
        company_id: form.company_id || null,
        notes: form.notes.trim() || null,
      } as any);
      toast.success('Contact updated');
      onClose();
    } catch {
      toast.error('Failed to update contact');
    } finally {
      setSaving(false);
    }
  };

  const activeCompanies = companies.filter((company) => !company.is_deleted);
  const filteredCompanies = companySearch
    ? activeCompanies.filter((company) => company.company_name.toLowerCase().includes(companySearch.toLowerCase()))
    : activeCompanies;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Edit Contact</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="First Name *">
              <Input value={form.first_name} onChange={(e) => setField('first_name', e.target.value)} autoFocus />
            </FormField>
            <FormField label="Last Name *">
              <Input value={form.last_name} onChange={(e) => setField('last_name', e.target.value)} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Email">
              <Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
            </FormField>
            <FormField label="Phone">
              <Input value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
            </FormField>
          </div>
          <FormField label="Role / Title">
            <Input value={form.role_or_title} onChange={(e) => setField('role_or_title', e.target.value)} />
          </FormField>
          <FormField label="Company">
            <Select value={form.company_id || '_none'} onValueChange={(value) => setField('company_id', value === '_none' ? '' : value)}>
              <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1.5">
                  <Input
                    placeholder="Search companies…"
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                    className="h-8 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <SelectItem value="_none">No company</SelectItem>
                {filteredCompanies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>{company.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
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

export default EditContactModal;
