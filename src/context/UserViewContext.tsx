import React, { createContext, useContext, useState } from 'react';

export const OWNERS = ['Pippa Bradley-Dixon', 'Craig Davies', 'Adam Solomons'] as const;
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
  const [selectedView, setSelectedView] = useState<UserView>('COEX');

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
