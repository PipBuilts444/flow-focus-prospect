import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Activity } from '@/types/activity';

interface UseActivitiesOptions {
  contactId?: string;
  companyId?: string;
  dealId?: string;
}

export const useActivities = (opts?: UseActivitiesOptions) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    let query = supabase
      .from('activities')
      .select('*')
      .order('activity_date', { ascending: false });

    if (opts?.contactId) query = query.eq('contact_id', opts.contactId);
    if (opts?.companyId) query = query.eq('company_id', opts.companyId);
    if (opts?.dealId) query = query.eq('deal_id', opts.dealId);

    const { data } = await query;
    if (data) setActivities(data as unknown as Activity[]);
    setLoading(false);
  }, [opts?.contactId, opts?.companyId, opts?.dealId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { activities, loading, refresh };
};

export const useAllActivities = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('activities')
      .select('*')
      .order('activity_date', { ascending: false });
    if (data) setActivities(data as unknown as Activity[]);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { activities, loading, refresh };
};
