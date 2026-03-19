import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCrm } from '@/context/CrmContext';
import { format } from 'date-fns';
import { Trash2, RotateCcw, Building2, User, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { formatGBP } from '@/lib/currency';

type Tab = 'deals' | 'contacts' | 'companies';

const DeletedItemsPage = () => {
  const navigate = useNavigate();
  const { allDeals, allContacts, allCompanies, restoreDeal, restoreContact, restoreCompany, getCompany } = useCrm();
  const [tab, setTab] = useState<Tab>('deals');
  const [restoring, setRestoring] = useState<string | null>(null);

  const deletedDeals = allDeals.filter(d => (d as any).is_deleted);
  const deletedContacts = (allContacts as any[]).filter(c => c.is_deleted);
  const deletedCompanies = allCompanies.filter(c => (c as any).is_deleted);

  const handleRestore = async (type: Tab, id: string) => {
    setRestoring(id);
    try {
      if (type === 'deals') await restoreDeal(id);
      else if (type === 'contacts') await restoreContact(id);
      else await restoreCompany(id);
      toast.success('Record restored');
    } catch {
      toast.error('Failed to restore');
    } finally {
      setRestoring(null);
    }
  };

  const tabs: { key: Tab; label: string; count: number; icon: any }[] = [
    { key: 'deals', label: 'Deals', count: deletedDeals.length, icon: Briefcase },
    { key: 'contacts', label: 'Contacts', count: deletedContacts.length, icon: User },
    { key: 'companies', label: 'Companies', count: deletedCompanies.length, icon: Building2 },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Trash2 size={22} className="text-destructive" />
          Deleted Items
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Soft-deleted records can be restored here</p>
      </div>

      <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-card text-card-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon size={14} />
            {t.label}
            {t.count > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {tab === 'deals' && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Deal</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Company</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Value</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Deleted</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">By</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deletedDeals.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No deleted deals</td></tr>
              ) : deletedDeals.map(d => (
                <tr key={d.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-card-foreground">{d.deal_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{getCompany(d.company_id || '')?.company_name || '—'}</td>
                  <td className="px-4 py-3 text-right text-card-foreground">{formatGBP(d.value)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {(d as any).deleted_at ? format(new Date((d as any).deleted_at), 'dd MMM yyyy HH:mm') : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{(d as any).deleted_by || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRestore('deals', d.id)}
                      disabled={restoring === d.id}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      <RotateCcw size={12} />
                      {restoring === d.id ? 'Restoring…' : 'Restore'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'contacts' && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Deleted</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">By</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deletedContacts.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No deleted contacts</td></tr>
              ) : deletedContacts.map((c: any) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-card-foreground">{c.full_name || `${c.first_name} ${c.last_name}`}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {c.deleted_at ? format(new Date(c.deleted_at), 'dd MMM yyyy HH:mm') : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{c.deleted_by || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRestore('contacts', c.id)}
                      disabled={restoring === c.id}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      <RotateCcw size={12} />
                      {restoring === c.id ? 'Restoring…' : 'Restore'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'companies' && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Company</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Industry</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Deleted</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">By</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deletedCompanies.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No deleted companies</td></tr>
              ) : deletedCompanies.map(c => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-card-foreground">{c.company_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.industry || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {(c as any).deleted_at ? format(new Date((c as any).deleted_at), 'dd MMM yyyy HH:mm') : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{(c as any).deleted_by || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRestore('companies', c.id)}
                      disabled={restoring === c.id}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      <RotateCcw size={12} />
                      {restoring === c.id ? 'Restoring…' : 'Restore'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DeletedItemsPage;
