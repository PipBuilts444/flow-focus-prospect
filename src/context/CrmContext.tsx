import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Company, Contact, Deal, HealthStatus } from '@/types/crm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CrmContextType {
  companies: Company[];
  contacts: Contact[];
  deals: Deal[];
  allCompanies: Company[];
  allContacts: Contact[];
  allDeals: Deal[];
  loading: boolean;
  refresh: () => Promise<void>;
  addCompany: (company: Partial<Company> & { company_name: string }) => Promise<Company | null>;
  addContact: (contact: Partial<Contact> & { first_name: string; last_name: string }) => Promise<Contact | null>;
  addDeal: (deal: Partial<Deal> & { deal_name: string }) => Promise<Deal | null>;
  updateDeal: (id: string, updates: Partial<Deal>) => Promise<void>;
  updateCompany: (id: string, updates: Partial<Company>) => Promise<void>;
  updateContact: (id: string, updates: Partial<Contact>) => Promise<void>;
  softDeleteDeal: (id: string, deletedBy?: string) => Promise<void>;
  softDeleteContact: (id: string, deletedBy?: string) => Promise<void>;
  softDeleteCompany: (id: string, deletedBy?: string) => Promise<void>;
  restoreDeal: (id: string) => Promise<void>;
  restoreContact: (id: string) => Promise<void>;
  restoreCompany: (id: string) => Promise<void>;
  getCompany: (id: string) => Company | undefined;
  getContact: (id: string) => Contact | undefined;
  getDeal: (id: string) => Deal | undefined;
  getDealsForCompany: (companyId: string) => Deal[];
  getContactsForCompany: (companyId: string) => Contact[];
  getDealHealth: (deal: Deal) => HealthStatus;
  canDeleteCompany: (companyId: string) => { canDelete: boolean; reason?: string };
}

const CrmContext = createContext<CrmContextType | null>(null);

export const useCrm = () => {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error('useCrm must be inside CrmProvider');
  return ctx;
};

export const CrmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rawCompanies, setRawCompanies] = useState<Company[]>([]);
  const [rawContacts, setRawContacts] = useState<Contact[]>([]);
  const [rawDeals, setRawDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  // Active (non-deleted) records for normal views
  const companies = rawCompanies.filter(c => !(c as any).is_deleted);
  const contacts = rawContacts.filter(c => !(c as any).is_deleted);
  const deals = rawDeals.filter(d => !(d as any).is_deleted);

  const refresh = useCallback(async () => {
    try {
      const [cRes, ctRes, dRes] = await Promise.all([
        supabase.from('companies').select('*').order('company_name'),
        supabase.from('contacts').select('*').order('full_name'),
        supabase.from('deals').select('*').order('created_at', { ascending: false }),
      ]);
      if (cRes.data) setRawCompanies(cRes.data);
      if (ctRes.data) setRawContacts(ctRes.data);
      if (dRes.data) setRawDeals(dRes.data);
    } catch (err) {
      console.error('Failed to refresh CRM data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addCompany = useCallback(async (c: Partial<Company> & { company_name: string }) => {
    try {
      const { data, error } = await supabase.from('companies').insert(c).select().single();
      if (error) throw error;
      if (data) { setRawCompanies(prev => [...prev, data]); return data; }
    } catch (err: any) {
      console.error('Failed to add company:', err);
      toast.error(err.message || 'Failed to add company');
    }
    return null;
  }, []);

  const addContact = useCallback(async (c: Partial<Contact> & { first_name: string; last_name: string }) => {
    try {
      const { data, error } = await supabase.from('contacts').insert(c).select().single();
      if (error) throw error;
      if (data) { setRawContacts(prev => [...prev, data]); return data; }
    } catch (err: any) {
      console.error('Failed to add contact:', err);
      toast.error(err.message || 'Failed to add contact');
    }
    return null;
  }, []);

  const addDeal = useCallback(async (d: Partial<Deal> & { deal_name: string }) => {
    try {
      const { data, error } = await supabase.from('deals').insert(d).select().single();
      if (error) throw error;
      if (data) { setRawDeals(prev => [data, ...prev]); return data; }
    } catch (err: any) {
      console.error('Failed to add deal:', err);
      toast.error(err.message || 'Failed to add deal');
    }
    return null;
  }, []);

  const updateDeal = useCallback(async (id: string, updates: Partial<Deal>) => {
    try {
      delete (updates as any).full_name;
      const { data, error } = await supabase.from('deals').update(updates).eq('id', id).select().single();
      if (error) throw error;
      if (data) setRawDeals(prev => prev.map(x => x.id === id ? data : x));
    } catch (err: any) {
      console.error('Failed to update deal:', err);
      toast.error(err.message || 'Failed to update deal');
      throw err; // re-throw so callers with their own try/catch can handle it
    }
  }, []);

  const updateCompany = useCallback(async (id: string, updates: Partial<Company>) => {
    try {
      const { data, error } = await supabase.from('companies').update(updates).eq('id', id).select().single();
      if (error) throw error;
      if (data) setRawCompanies(prev => prev.map(x => x.id === id ? data : x));
    } catch (err: any) {
      console.error('Failed to update company:', err);
      toast.error(err.message || 'Failed to update company');
      throw err;
    }
  }, []);

  const updateContact = useCallback(async (id: string, updates: Partial<Contact>) => {
    try {
      const { data, error } = await supabase.from('contacts').update(updates).eq('id', id).select().single();
      if (error) throw error;
      if (data) setRawContacts(prev => prev.map(x => x.id === id ? data : x));
    } catch (err: any) {
      console.error('Failed to update contact:', err);
      toast.error(err.message || 'Failed to update contact');
      throw err;
    }
  }, []);

  const softDeleteDeal = useCallback(async (id: string, deletedBy?: string) => {
    try {
      const updates = { is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: deletedBy || null } as any;
      const { data, error } = await supabase.from('deals').update(updates).eq('id', id).select().single();
      if (error) throw error;
      if (data) setRawDeals(prev => prev.map(x => x.id === id ? data : x));
    } catch (err: any) {
      console.error('Failed to delete deal:', err);
      toast.error(err.message || 'Failed to delete deal');
    }
  }, []);

  const softDeleteContact = useCallback(async (id: string, deletedBy?: string) => {
    try {
      const updates = { is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: deletedBy || null } as any;
      const { data, error } = await supabase.from('contacts').update(updates).eq('id', id).select().single();
      if (error) throw error;
      if (data) setRawContacts(prev => prev.map(x => x.id === id ? data : x));
    } catch (err: any) {
      console.error('Failed to delete contact:', err);
      toast.error(err.message || 'Failed to delete contact');
    }
  }, []);

  const softDeleteCompany = useCallback(async (id: string, deletedBy?: string) => {
    try {
      const updates = { is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: deletedBy || null } as any;
      const { data, error } = await supabase.from('companies').update(updates).eq('id', id).select().single();
      if (error) throw error;
      if (data) setRawCompanies(prev => prev.map(x => x.id === id ? data : x));
    } catch (err: any) {
      console.error('Failed to delete company:', err);
      toast.error(err.message || 'Failed to delete company');
    }
  }, []);

  const restoreDeal = useCallback(async (id: string) => {
    try {
      const updates = { is_deleted: false, deleted_at: null, deleted_by: null } as any;
      const { data, error } = await supabase.from('deals').update(updates).eq('id', id).select().single();
      if (error) throw error;
      if (data) setRawDeals(prev => prev.map(x => x.id === id ? data : x));
    } catch (err: any) {
      console.error('Failed to restore deal:', err);
      toast.error(err.message || 'Failed to restore deal');
    }
  }, []);

  const restoreContact = useCallback(async (id: string) => {
    try {
      const updates = { is_deleted: false, deleted_at: null, deleted_by: null } as any;
      const { data, error } = await supabase.from('contacts').update(updates).eq('id', id).select().single();
      if (error) throw error;
      if (data) setRawContacts(prev => prev.map(x => x.id === id ? data : x));
    } catch (err: any) {
      console.error('Failed to restore contact:', err);
      toast.error(err.message || 'Failed to restore contact');
    }
  }, []);

  const restoreCompany = useCallback(async (id: string) => {
    try {
      const updates = { is_deleted: false, deleted_at: null, deleted_by: null } as any;
      const { data, error } = await supabase.from('companies').update(updates).eq('id', id).select().single();
      if (error) throw error;
      if (data) setRawCompanies(prev => prev.map(x => x.id === id ? data : x));
    } catch (err: any) {
      console.error('Failed to restore company:', err);
      toast.error(err.message || 'Failed to restore company');
    }
  }, []);

  const canDeleteCompany = useCallback((companyId: string): { canDelete: boolean; reason?: string } => {
    const activeDeals = deals.filter(d => d.company_id === companyId);
    const activeContacts = contacts.filter(c => c.company_id === companyId);
    if (activeDeals.length > 0) {
      return { canDelete: false, reason: `Company has ${activeDeals.length} active deal(s). Archive or delete them first.` };
    }
    if (activeContacts.length > 0) {
      return { canDelete: false, reason: `Company has ${activeContacts.length} active contact(s). Archive or delete them first.` };
    }
    return { canDelete: true };
  }, [deals, contacts]);

  // Lookups search all records (including deleted) to preserve historical links
  const getCompany = useCallback((id: string) => rawCompanies.find(c => c.id === id), [rawCompanies]);
  const getContact = useCallback((id: string) => rawContacts.find(c => c.id === id), [rawContacts]);
  const getDeal = useCallback((id: string) => rawDeals.find(d => d.id === id), [rawDeals]);
  const getDealsForCompany = useCallback((cid: string) => deals.filter(d => d.company_id === cid), [deals]);
  const getContactsForCompany = useCallback((cid: string) => contacts.filter(c => c.company_id === cid), [contacts]);

  const getDealHealth = useCallback((deal: Deal): HealthStatus => {
    if (deal.status !== 'open') return 'green';
    const now = new Date();
    const nextAction = deal.next_action_date ? new Date(deal.next_action_date) : null;
    const updated = new Date(deal.updated_at);
    const daysSinceUpdate = (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);
    const isOverdue = nextAction && nextAction < now;
    const isStale = daysSinceUpdate > 14;

    if (isOverdue || deal.slip_count >= 3 || daysSinceUpdate > 30) return 'red';
    if (isStale || deal.slip_count >= 1 || (nextAction && (nextAction.getTime() - now.getTime()) < 3 * 24 * 60 * 60 * 1000)) return 'amber';
    return 'green';
  }, []);

  return (
    <CrmContext.Provider value={{
      companies, contacts, deals,
      allCompanies: rawCompanies, allContacts: rawContacts, allDeals: rawDeals,
      loading, refresh,
      addCompany, addContact, addDeal, updateDeal, updateCompany, updateContact,
      softDeleteDeal, softDeleteContact, softDeleteCompany,
      restoreDeal, restoreContact, restoreCompany,
      getCompany, getContact, getDeal, getDealsForCompany, getContactsForCompany, getDealHealth,
      canDeleteCompany,
    }}>
      {children}
    </CrmContext.Provider>
  );
};
