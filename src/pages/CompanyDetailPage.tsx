import { useParams, useNavigate } from 'react-router-dom';
import { useCrm } from '@/context/CrmContext';
import { ArrowLeft, Building2 } from 'lucide-react';

const CompanyDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getCompany, getDealsForCompany, getContactsForCompany } = useCrm();

  const company = getCompany(id || '');
  if (!company) return <div className="p-6"><p className="text-muted-foreground">Company not found</p></div>;

  const companyDeals = getDealsForCompany(company.id);
  const companyContacts = getContactsForCompany(company.id);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Building2 size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{company.company_name}</h1>
          <p className="text-sm text-muted-foreground">{company.industry} · {company.website}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-border p-5 space-y-3">
          <h2 className="text-sm font-semibold text-card-foreground">Details</h2>
          <div className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Account Owner:</span> <span className="text-card-foreground ml-1">{company.account_owner}</span></div>
            <div><span className="text-muted-foreground">Status:</span> <span className="text-card-foreground ml-1 capitalize">{company.status}</span></div>
            <div><span className="text-muted-foreground">Notes:</span> <span className="text-card-foreground ml-1">{company.notes || '—'}</span></div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-5 space-y-3">
          <h2 className="text-sm font-semibold text-card-foreground">Contacts ({companyContacts.length})</h2>
          <div className="space-y-2">
            {companyContacts.map(c => (
              <div key={c.id} className="flex items-center justify-between text-sm p-2 rounded hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => navigate(`/contacts/${c.id}`)}>
                <div>
                  <span className="font-medium text-card-foreground">{c.full_name}</span>
                  <span className="text-muted-foreground ml-2">{c.role_or_title}</span>
                </div>
                <span className="text-muted-foreground text-xs">{c.email}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-5">
        <h2 className="text-sm font-semibold text-card-foreground mb-3">Deals ({companyDeals.length})</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Deal</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Stage</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">Value</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {companyDeals.map(d => (
              <tr key={d.id} className="border-b border-border last:border-0 hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => navigate(`/deals/${d.id}`)}>
                <td className="px-3 py-2.5 font-medium text-card-foreground">{d.deal_name}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{d.stage}</td>
                <td className="px-3 py-2.5 text-right text-card-foreground">£{d.value.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-muted-foreground capitalize">{d.status.replace('_', ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CompanyDetailPage;
