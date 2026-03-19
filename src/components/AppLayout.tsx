import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Kanban, List, Building2, Users, TrendingUp, ChevronLeft, ChevronRight, ChevronDown, CalendarPlus } from 'lucide-react';
import { useState } from 'react';
import { useUserView, OWNERS, UserView } from '@/context/UserViewContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pipeline', icon: Kanban, label: 'Pipeline' },
  { to: '/deals', icon: List, label: 'Deals' },
  { to: '/companies', icon: Building2, label: 'Companies' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/forecast', icon: TrendingUp, label: 'Forecast' },
];

const VIEW_OPTIONS: { value: UserView; label: string; subtitle?: string }[] = [
  { value: 'COEX', label: 'COEX', subtitle: 'All users' },
  ...OWNERS.map(o => ({ value: o as UserView, label: o })),
];

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { selectedView, setSelectedView } = useUserView();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className={`${collapsed ? 'w-16' : 'w-56'} bg-sidebar flex flex-col transition-all duration-200 shrink-0`}>
        <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <span className="text-primary-foreground font-extrabold text-lg tracking-tight bg-primary rounded px-1.5 py-0.5 leading-none">CO</span>
              <span className="text-sidebar-active font-bold text-lg tracking-tight">Pipeline</span>
            </div>
          )}
          {collapsed && (
            <span className="text-primary-foreground font-extrabold text-xs bg-primary rounded px-1 py-0.5 leading-none mx-auto">CO</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-sidebar-foreground hover:text-sidebar-active transition-colors p-1"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
        <nav className="flex-1 py-3 space-y-1 px-2">
          {navItems.map(item => {
            const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sidebar-hover text-sidebar-active'
                    : 'text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-active'
                }`}
              >
                <item.icon size={18} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
        {!collapsed && (
          <div className="px-4 py-3 border-t border-sidebar-border">
            <p className="text-xs text-sidebar-foreground/60">COEX Commercial Platform</p>
          </div>
        )}
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Viewing as</span>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-input bg-background text-sm font-semibold text-foreground hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring">
                {selectedView === 'COEX' && (
                  <span className="text-primary-foreground font-extrabold text-[10px] bg-primary rounded px-1 py-0.5 leading-none">CO</span>
                )}
                <span>{selectedView === 'COEX' ? 'COEX – All' : selectedView}</span>
                <ChevronDown size={14} className="text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {VIEW_OPTIONS.map((opt, i) => (
                  <React.Fragment key={opt.value}>
                    {i === 1 && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      onClick={() => setSelectedView(opt.value)}
                      className={`flex items-center gap-2 ${selectedView === opt.value ? 'bg-accent' : ''}`}
                    >
                      {opt.value === 'COEX' && (
                        <span className="text-primary-foreground font-extrabold text-[10px] bg-primary rounded px-1 py-0.5 leading-none">CO</span>
                      )}
                      <div>
                        <p className="font-medium">{opt.label}</p>
                        {opt.subtitle && <p className="text-xs text-muted-foreground">{opt.subtitle}</p>}
                      </div>
                    </DropdownMenuItem>
                  </React.Fragment>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
