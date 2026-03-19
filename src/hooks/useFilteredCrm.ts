import { useMemo } from 'react';
import { useCrm } from '@/context/CrmContext';
import { useUserView } from '@/context/UserViewContext';

export const useFilteredCrm = () => {
  const crm = useCrm();
  const { selectedView, isFiltered } = useUserView();

  const filteredDeals = useMemo(() => {
    if (!isFiltered) return crm.deals;
    return crm.deals.filter(d => d.owner === selectedView);
  }, [crm.deals, selectedView, isFiltered]);

  const filteredCompanies = useMemo(() => {
    if (!isFiltered) return crm.companies;
    return crm.companies.filter(c => c.account_owner === selectedView);
  }, [crm.companies, selectedView, isFiltered]);

  const filteredContacts = useMemo(() => {
    if (!isFiltered) return crm.contacts;
    // Filter contacts by company ownership
    const ownedCompanyIds = new Set(filteredCompanies.map(c => c.id));
    return crm.contacts.filter(c => c.company_id && ownedCompanyIds.has(c.company_id));
  }, [crm.contacts, filteredCompanies, isFiltered]);

  return {
    ...crm,
    deals: filteredDeals,
    companies: filteredCompanies,
    contacts: filteredContacts,
  };
};
