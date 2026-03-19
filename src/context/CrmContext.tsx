import React, { createContext, useContext, useState, useCallback } from 'react';
import { Company, Contact, Deal, DealStage, STAGE_CONFIDENCE, HealthStatus } from '@/types/crm';
import { seedCompanies, seedContacts, seedDeals } from '@/data/seed';

interface CrmContextType {
  companies: Company[];
  contacts: Contact[];
  deals: Deal[];
  addCompany: (company: Company) => void;
  addContact: (contact: Contact) => void;
  addDeal: (deal: Deal) => void;
  updateDeal: (deal: Deal) => void;
  updateCompany: (company: Company) => void;
  updateContact: (contact: Contact) => void;
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
  const [companies, setCompanies] = useState<Company[]>(seedCompanies);
  const [contacts, setContacts] = useState<Contact[]>(seedContacts);
  const [deals, setDeals] = useState<Deal[]>(seedDeals);

  const addCompany = useCallback((c: Company) => setCompanies(prev => [...prev, c]), []);
  const addContact = useCallback((c: Contact) => setContacts(prev => [...prev, c]), []);
  const addDeal = useCallback((d: Deal) => {
    const withWeighted = { ...d, weighted_value: d.value * (d.confidence_percent / 100) };
    setDeals(prev => [...prev, withWeighted]);
  }, []);

  const updateDeal = useCallback((d: Deal) => {
    const withWeighted = { ...d, weighted_value: d.value * (d.confidence_percent / 100) };
    setDeals(prev => prev.map(x => x.id === d.id ? withWeighted : x));
  }, []);

  const updateCompany = useCallback((c: Company) => setCompanies(prev => prev.map(x => x.id === c.id ? c : x)), []);
  const updateContact = useCallback((c: Contact) => setContacts(prev => prev.map(x => x.id === c.id ? c : x)), []);

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
      companies, contacts, deals,
      addCompany, addContact, addDeal, updateDeal, updateCompany, updateContact,
      getCompany, getContact, getDeal, getDealsForCompany, getContactsForCompany, getDealHealth,
    }}>
      {children}
    </CrmContext.Provider>
  );
};
