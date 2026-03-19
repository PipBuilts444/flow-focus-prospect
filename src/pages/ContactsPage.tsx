import { useCrm } from '@/context/CrmContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Search, Users } from 'lucide-react';

const ContactsPage = () => {
  const { contacts, getCompany, deals } = useCrm();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = contacts.filter(c =>
    !search || c.full_name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} contacts</p>
      </div>

      <div className="relative w-64">
        <Search size={16} className="absolute left-2.5 top-2.5 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts…" className="pl-8 pr-3 py-2 text-sm rounded-md border border-input bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring w-full" />
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Title</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Company</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Email</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Phone</th>
              <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Deals</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(contact => {
              const company = getCompany(contact.company_id);
              const contactDeals = deals.filter(d => d.primary_contact_id === contact.id);
              return (
                <tr key={contact.id} className="border-b border-border last:border-0 hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => navigate(`/contacts/${contact.id}`)}>
                  <td className="px-4 py-3 font-medium text-card-foreground">{contact.full_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{contact.role_or_title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{company?.company_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{contact.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{contact.phone}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{contactDeals.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContactsPage;
