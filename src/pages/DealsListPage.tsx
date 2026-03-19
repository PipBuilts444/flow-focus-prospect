import { useCrm } from '@/context/CrmContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEAL_STAGES, FORECAST_CATEGORIES } from '@/types/crm';
import { Search, Plus } from 'lucide-react';

const healthDot: Record<string, string> = {
  green: 'bg-health-green',
  amber: 'bg-health-amber',
  red: 'bg-health-red',
};

const DealsListPage = () => {
  const { deals, getCompany, getDealHealth, loading } = useCrm();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  if (loading) return <div className="p-6"><p className="text-muted-foreground">Loading…</p></div>;

  const filtered = deals.filter(d => {
    const company = getCompany(d.company_id || '');
    const matchSearch = !search || d.deal_name.toLowerCase().includes(search.toLowerCase()) || company?.company_name.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === 'all' || d.stage === stageFilter;
    const matchCat = categoryFilter === 'all' || d.forecast_category === categoryFilter;
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchSearch && matchStage && matchCat && matchStatus;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Deals</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} deals</p>
        </div>
        <button onClick={() => navigate('/deals/new')} className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus size={16} /> New Deal
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search size={16} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search deals…" className="pl-8 pr-3 py-2 text-sm rounded-md border border-input bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring w-64" />
        </div>
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="text-sm rounded-md border border-input bg-card text-card-foreground px-3 py-2">
          <option value="all">All Stages</option>
          {DEAL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="text-sm rounded-md border border-input bg-card text-card-foreground px-3 py-2">
          <option value="all">All Categories</option>
          {FORECAST_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm rounded-md border border-input bg-card text-card-foreground px-3 py-2">
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="closed_won">Closed Won</option>
          <option value="closed_lost">Closed Lost</option>
        </select>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Deal</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Company</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Stage</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Value</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Weighted</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Category</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Close Date</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Owner</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Health</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(deal => {
                const company = getCompany(deal.company_id || '');
                const health = getDealHealth(deal);
                return (
                  <tr key={deal.id} onClick={() => navigate(`/deals/${deal.id}`)} className="border-b border-border last:border-0 hover:bg-accent/50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-medium text-card-foreground">{deal.deal_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{company?.company_name}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{deal.stage}</span></td>
                    <td className="px-4 py-3 text-right font-medium text-card-foreground">£{deal.value.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">£{(deal.weighted_value || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground">{deal.forecast_category}</td>
                    <td className="px-4 py-3 text-muted-foreground">{deal.expected_close_date}</td>
                    <td className="px-4 py-3 text-muted-foreground">{deal.owner}</td>
                    <td className="px-4 py-3 text-center"><span className={`inline-block w-2.5 h-2.5 rounded-full ${healthDot[health]}`} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DealsListPage;
