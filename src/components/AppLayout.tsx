import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Kanban, List, Building2, Users, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pipeline', icon: Kanban, label: 'Pipeline' },
  { to: '/deals', icon: List, label: 'Deals' },
  { to: '/companies', icon: Building2, label: 'Companies' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/forecast', icon: TrendingUp, label: 'Forecast' },
];

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className={`${collapsed ? 'w-16' : 'w-56'} bg-sidebar flex flex-col transition-all duration-200 shrink-0`}>
        <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border">
          {!collapsed && (
            <span className="text-sidebar-active font-bold text-lg tracking-tight">Pipeline</span>
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
            <p className="text-xs text-sidebar-foreground/60">Consultancy CRM</p>
          </div>
        )}
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
