import { useParams, useNavigate } from 'react-router-dom';
import { useCrm } from '@/context/CrmContext';
import { ArrowLeft, User } from 'lucide-react';

const ContactDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getContact, getCompany, deals } = useCrm();

  const contact = getContact(id || '');
  if (!contact) return <div className="p-6"><p className="text-muted-foreground">Contact not found</p></div>;

  const company = getCompany(contact.company_id);
  const contactDeals = deals.filter(d => d.primary_contact_id === contact.id);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <User size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{contact.full_name}</h1>
          <p className="text-sm text-muted-foreground">{contact.role_or_title} at {company?.company_name}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-border p-5 space-y-3">
          <h2 className="text-sm font-semibold text-card-foreground">Contact Info</h2>
          <div className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Email:</span> <span className="text-card-foreground ml-1">{contact.email}</span></div>
            <div><span className="text-muted-foreground">Phone:</span> <span className="text-card-foreground ml-1">{contact.phone}</span></div>
            <div><span className="text-muted-foreground">Company:</span> <span className="text-primary ml-1 cursor-pointer hover:underline" onClick={() => navigate(`/companies/${contact.company_id}`)}>{company?.company_name}</span></div>
            <div><span className="text-muted-foreground">Notes:</span> <span className="text-card-foreground ml-1">{contact.notes || '—'}</span></div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-5">
          <h2 className="text-sm font-semibold text-card-foreground mb-3">Deals ({contactDeals.length})</h2>
          <div className="space-y-2">
            {contactDeals.map(d => (
              <div key={d.id} className="flex items-center justify-between text-sm p-2 rounded hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => navigate(`/deals/${d.id}`)}>
                <span className="font-medium text-card-foreground">{d.deal_name}</span>
                <span className="text-muted-foreground">£{d.value.toLocaleString()}</span>
              </div>
            ))}
            {contactDeals.length === 0 && <p className="text-sm text-muted-foreground">No deals linked</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactDetailPage;
