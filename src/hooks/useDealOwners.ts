import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DealOwner {
  id: string;
  deal_id: string;
  user_name: string;
  ownership_percent: number;
  role: 'primary' | 'shared';
  created_at: string;
}

export const useDealOwners = () => {
  const [owners, setOwners] = useState<DealOwner[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('deal_owners')
      .select('*')
      .order('role', { ascending: true });
    if (data) setOwners(data as DealOwner[]);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const getOwnersForDeal = useCallback(
    (dealId: string) => owners.filter(o => o.deal_id === dealId),
    [owners]
  );

  const getPrimaryOwner = useCallback(
    (dealId: string) => owners.find(o => o.deal_id === dealId && o.role === 'primary'),
    [owners]
  );

  const getOwnershipPercent = useCallback(
    (dealId: string, userName: string) => {
      const owner = owners.find(o => o.deal_id === dealId && o.user_name === userName);
      return owner ? owner.ownership_percent / 100 : 0;
    },
    [owners]
  );

  const isOwner = useCallback(
    (dealId: string, userName: string) => owners.some(o => o.deal_id === dealId && o.user_name === userName),
    [owners]
  );

  const saveDealOwners = useCallback(async (
    dealId: string,
    newOwners: { user_name: string; ownership_percent: number; role: 'primary' | 'shared' }[]
  ) => {
    // Delete existing, then insert new
    await supabase.from('deal_owners').delete().eq('deal_id', dealId);
    if (newOwners.length > 0) {
      const rows = newOwners.map(o => ({ deal_id: dealId, ...o }));
      await supabase.from('deal_owners').insert(rows);
    }
    // Also update the legacy owner field for backwards compat
    const primary = newOwners.find(o => o.role === 'primary');
    if (primary) {
      await supabase.from('deals').update({ owner: primary.user_name }).eq('id', dealId);
    }
    await refresh();
  }, [refresh]);

  return { owners, loading, getOwnersForDeal, getPrimaryOwner, getOwnershipPercent, isOwner, saveDealOwners, refresh };
};
