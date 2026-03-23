import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCrm } from '@/context/CrmContext';
import { ArrowLeft, User, Trash2, Pencil } from 'lucide-react';
import { formatGBP } from '@/lib/currency';
import ActivityTimeline from '@/components/ActivityTimeline';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import EditContactModal from '@/components/EditContactModal';
import { toast } from 'sonner';
import { useUserView } from '@/context/UserViewContext';

const ContactDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getContact, getCompany, deals, softDeleteContact } = useCrm();
  const { selectedView } = useUserView();
  const [showDelete, setShowDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const contact = getContact(id || '');
  if (!contact) return <div className="p-6"><p className="text-muted-foreground">Contact not found</p></div>;

  const company = getCompany(contact.company_id || '');
  const contactDeals = deals.filter(d => d.primary_contact_id === contact.id);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await softDeleteContact(contact.id, selectedView === 'COEX' ? undefined : selectedView);
      toast.success('Contact deleted');
      navigate('/contacts');
    } catch {
      toast.error('Failed to delete contact');
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  };

  const logActivityUrl = `/activities/new?contact_id=${contact.id}${contact.company_id ? `&company_id=${contact.company_id}` : ''}`;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <User size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{contact.full_name}</h1>
            <p className="text-sm text-muted-foreground">{contact.role_or_title} at {company?.company_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEdit(true)}
            className="p-2 rounded-md border border-input text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
            title="Edit contact"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="p-2 rounded-md border border-input text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors"
            title="Delete contact"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-border p-5 space-y-3">
          <h2 className="text-sm font-semibold text-card-foreground">Contact Info</h2>
          <div className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Email:</span> <span className="text-card-foreground ml-1">{contact.email || '—'}</span></div>
            <div><span className="text-muted-foreground">Phone:</span> <span className="text-card-foreground ml-1">{contact.phone || '—'}</span></div>
            <div><span className="text-muted-foreground">Company:</span> {company ? <span className="text-primary ml-1 cursor-pointer hover:underline" onClick={() => navigate(`/companies/${contact.company_id}`)}>{company.company_name}</span> : <span className="text-card-foreground ml-1">—</span>}</div>
            <div><span className="text-muted-foreground">Notes:</span> <span className="text-card-foreground ml-1">{contact.notes || '—'}</span></div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-5">
          <h2 className="text-sm font-semibold text-card-foreground mb-3">Deals ({contactDeals.length})</h2>
          <div className="space-y-2">
            {contactDeals.map(d => (
              <div key={d.id} className="flex items-center justify-between text-sm p-2 rounded hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => navigate(`/deals/${d.id}`)}>
                <span className="font-medium text-card-foreground">{d.deal_name}</span>
                <span className="text-muted-foreground">{formatGBP(d.value)}</span>
              </div>
            ))}
            {contactDeals.length === 0 && <p className="text-sm text-muted-foreground">No deals linked</p>}
          </div>
        </div>
      </div>

      <ActivityTimeline
        contactId={contact.id}
        onLogActivity={() => navigate(logActivityUrl)}
      />

      <EditContactModal open={showEdit} contact={contact} onClose={() => setShowEdit(false)} />

      <ConfirmDeleteModal
        open={showDelete}
        title="Delete Contact"
        description={`"${contact.full_name}" will be soft-deleted and hidden from active views.`}
        warning="Historical links to deals and activities will be preserved. You can restore from the Deleted Items page."
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        loading={deleting}
      />
    </div>
  );
};

export default ContactDetailPage;
