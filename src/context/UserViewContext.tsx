import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EMAIL_TO_OWNER } from '@/lib/userMap';

export const OWNERS = ['Pippa Bradley-Dixon', 'Craig Davies', 'Adam Solomons', 'Henry Hickley'] as const;
export const ORIGINATORS = ['Pippa Bradley-Dixon', 'Craig Davies', 'Adam Solomons', 'Henry Hickley'] as const;
export type Owner = typeof OWNERS[number];
export type UserView = 'COEX' | Owner;

interface UserViewContextType {
  selectedView: UserView;
  setSelectedView: (view: UserView) => void;
  isFiltered: boolean;
}

const UserViewContext = createContext<UserViewContextType | null>(null);

export const useUserView = () => {
  const ctx = useContext(UserViewContext);
  if (!ctx) throw new Error('useUserView must be inside UserViewProvider');
  return ctx;
};

export const UserViewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedView, setSelectedView] = useState<UserView>(() => {
    // Overridden by the auth check below once the session resolves.
    return (localStorage.getItem('selectedView') as UserView) || 'COEX';
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email;
      if (email && EMAIL_TO_OWNER[email]) {
        setSelectedView(EMAIL_TO_OWNER[email] as Owner);
        localStorage.setItem('selectedView', EMAIL_TO_OWNER[email]);
      }
    });
  }, []);

  return (
    <UserViewContext.Provider value={{
      selectedView,
      setSelectedView,
      isFiltered: selectedView !== 'COEX',
    }}>
      {children}
    </UserViewContext.Provider>
  );
};
