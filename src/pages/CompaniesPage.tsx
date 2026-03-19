import { useFilteredCrm } from '@/hooks/useFilteredCrm';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Search, Building2 } from 'lucide-react';

const CompaniesPage = () => {
  const { companies, getDealsForCompany, getContactsForCompany, loading } = useFilteredCrm();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  if (loading) return <div className="p-6"><p className="text-muted-foreground">Loading…</p></div>;

  const filtered = companies.filter(c =>
    !search || c.company_name.toLowerCase().includes(search.toLowerCase()) || (c.industry || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Companies</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} companies</p>
      </div>

      <div className="relative w-64">
        <Search size={16} className="absolute left-2.5 top-2.5 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search companies…" className="pl-8 pr-3 py-2 text-sm rounded-md border border-input bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring w-full" />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(company => {
          const deals = getDealsForCompany(company.id);
          const contacts = getContactsForCompany(company.id);
          const totalValue = deals.filter(d => d.status === 'open').reduce((s, d) => s + d.value, 0);
          return (
            <div key={company.id} className="bg-card rounded-lg border border-border p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/companies/${company.id}`)}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <Building2 size={16} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-card-foreground">{company.company_name}</h3>
                  <p className="text-xs text-muted-foreground">{company.industry}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span>{deals.length} deals</span>
                <span>{contacts.length} contacts</span>
                <span className="ml-auto font-medium text-card-foreground">{formatGBP(totalValue)}</span>
              </div>
              <div className="mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${company.status === 'active' ? 'bg-health-green/15 text-health-green' : company.status === 'prospect' ? 'bg-primary/15 text-primary' : 'bg-accent text-muted-foreground'}`}>
                  {company.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CompaniesPage;
