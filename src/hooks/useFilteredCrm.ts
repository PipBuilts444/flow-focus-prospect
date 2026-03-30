import { useMemo } from 'react';
import { useCrm } from '@/context/CrmContext';
import { useUserView } from '@/context/UserViewContext';
import { useDealOwners } from '@/hooks/useDealOwners';
import type { Deal } from '@/types/crm';

export interface SplitDeal extends Deal {
  splitFraction: number;
  splitValue: number;
  splitWeightedValue: number;
  splitMarginValue: number;
}

export const useFilteredCrm = () => {
  const crm = useCrm();
  const { selectedView, isFiltered } = useUserView();
  const { owners, getOwnershipPercent, isOwner, loading: ownersLoading, getOwnersForDeal, getPrimaryOwner, saveDealOwners, refresh: refreshOwners } = useDealOwners();

  const filteredDeals = useMemo((): SplitDeal[] => {
    const base = isFiltered
      ? crm.deals.filter(d => isOwner(d.id, selectedView) || d.owner === selectedView)
      : crm.deals;

    return base.map(d => {
      const ownershipPct = getOwnershipPercent(d.id, selectedView);
      // If filtered user matches legacy owner but has no deal_owners record, treat as 100%
      const fraction = isFiltered ? (ownershipPct > 0 ? ownershipPct : 1) : 1;
      return {
        ...d,
        splitFraction: fraction,
        splitValue: d.value * fraction,
        splitWeightedValue: (d.weighted_value || 0) * fraction,
        splitMarginValue: (d.gross_margin_value || 0) * fraction,
      };
    });
  }, [crm.deals, selectedView, isFiltered, owners]);

  const filteredCompanies = useMemo(() => {
    if (!isFiltered) return crm.companies;
    return crm.companies.filter(c => c.account_owner === selectedView);
  }, [crm.companies, selectedView, isFiltered]);

  const filteredContacts = useMemo(() => {
    if (!isFiltered) return crm.contacts;
    const ownedCompanyIds = new Set(filteredCompanies.map(c => c.id));
    return crm.contacts.filter(c => c.company_id && ownedCompanyIds.has(c.company_id));
  }, [crm.contacts, filteredCompanies, isFiltered]);

  return {
    ...crm,
    deals: filteredDeals,
    companies: filteredCompanies,
    contacts: filteredContacts,
    dealOwners: { owners, getOwnersForDeal, getPrimaryOwner, getOwnershipPercent, isOwner, saveDealOwners, refreshOwners, loading: ownersLoading },
  };
};
