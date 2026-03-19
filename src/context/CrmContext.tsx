import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Company, Contact, Deal, HealthStatus } from '@/types/crm';
import { supabase } from '@/integrations/supabase/client';

interface CrmContextType {
  companies: Company[];
  contacts: Contact[];
  deals: Deal[];
  loading: boolean;
  refresh: () => Promise<void>;
  addCompany: (company: Partial<Company> & { company_name: string }) => Promise<Company | null>;
  addContact: (contact: Partial<Contact> & { first_name: string; last_name: string }) => Promise<Contact | null>;
  addDeal: (deal: Partial<Deal> & { deal_name: string }) => Promise<Deal | null>;
  updateDeal: (id: string, updates: Partial<Deal>) => Promise<void>;
  updateCompany: (id: string, updates: Partial<Company>) => Promise<void>;
  updateContact: (id: string, updates: Partial<Contact>) => Promise<void>;
  getCompany: (id: string) => Company | undefined;
  getContact: (id: string) => Contact | undefined;
  getDeal: (id: string) => Deal | undefined;
  getDealsForCompany: (companyId: string) => Deal[];
  getContactsForCompany: (companyId: string) => Contact[];
  getDealHealth: (deal: Deal) => HealthStatus;
}

const CrmContext = createContext<CrmContextType | null>(null);

export const useCrm = () => {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error('useCrm must be inside CrmProvider');
  return ctx;
};

export const CrmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [cRes, ctRes, dRes] = await Promise.all([
      supabase.from('companies').select('*').order('company_name'),
      supabase.from('contacts').select('*').order('full_name'),
      supabase.from('deals').select('*').order('created_at', { ascending: false }),
    ]);
    if (cRes.data) setCompanies(cRes.data);
    if (ctRes.data) setContacts(ctRes.data);
    if (dRes.data) setDeals(dRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addCompany = useCallback(async (c: Partial<Company> & { company_name: string }) => {
    const { data } = await supabase.from('companies').insert(c).select().single();
    if (data) { setCompanies(prev => [...prev, data]); return data; }
    return null;
  }, []);

  const addContact = useCallback(async (c: Partial<Contact> & { first_name: string; last_name: string }) => {
    const { data } = await supabase.from('contacts').insert(c).select().single();
    if (data) { setContacts(prev => [...prev, data]); return data; }
    return null;
  }, []);

  const addDeal = useCallback(async (d: Partial<Deal> & { deal_name: string }) => {
    const { data } = await supabase.from('deals').insert(d).select().single();
    if (data) { setDeals(prev => [data, ...prev]); return data; }
    return null;
  }, []);

  const updateDeal = useCallback(async (id: string, updates: Partial<Deal>) => {
    const { data } = await supabase.from('deals').update(updates).eq('id', id).select().single();
    if (data) setDeals(prev => prev.map(x => x.id === id ? data : x));
  }, []);

  const updateCompany = useCallback(async (id: string, updates: Partial<Company>) => {
    const { data } = await supabase.from('companies').update(updates).eq('id', id).select().single();
    if (data) setCompanies(prev => prev.map(x => x.id === id ? data : x));
  }, []);

  const updateContact = useCallback(async (id: string, updates: Partial<Contact>) => {
    const { data } = await supabase.from('contacts').update(updates).eq('id', id).select().single();
    if (data) setContacts(prev => prev.map(x => x.id === id ? data : x));
  }, []);

  const getCompany = useCallback((id: string) => companies.find(c => c.id === id), [companies]);
  const getContact = useCallback((id: string) => contacts.find(c => c.id === id), [contacts]);
  const getDeal = useCallback((id: string) => deals.find(d => d.id === id), [deals]);
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
      companies, contacts, deals, loading, refresh,
      addCompany, addContact, addDeal, updateDeal, updateCompany, updateContact,
      getCompany, getContact, getDeal, getDealsForCompany, getContactsForCompany, getDealHealth,
    }}>
      {children}
    </CrmContext.Provider>
  );
};
