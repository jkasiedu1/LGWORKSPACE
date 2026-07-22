import { useState } from 'react';
import {
  Home,
  Users,
  Calendar,
  DollarSign,
  Music,
  Briefcase,
  Shield,
  BarChart3,
  Sparkles,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  UserCircle,
} from 'lucide-react';

export default function Sidebar({ className = '', activeApp, setActiveApp, user, onLogout, onSettings, isAdmin, isSeniorPastor }) {
  const [collapsed, setCollapsed] = useState(false);

  const navigationSections = [
    {
      title: 'Overview',
      items: [
        { id: 'home', label: 'Home', icon: Home },
      ],
    },
    {
      title: 'Core Apps',
      items: [
        { id: 'people', label: 'People', icon: Users },
        { id: 'calendar', label: 'Calendar', icon: Calendar },
        { id: 'giving', label: 'Giving', icon: DollarSign, adminOnly: true },
        { id: 'services', label: 'Services', icon: Briefcase },
        { id: 'music', label: 'Music', icon: Music },
      ],
    },
    {
      title: 'Community',
      items: [
        { id: 'community', label: 'Community', icon: Users },
        { id: 'teams', label: 'Teams', icon: Users },
      ],
    },
    {
      title: 'Management',
      items: [
        { id: 'workflows', label: 'Workflows', icon: Sparkles, adminOnly: true },
        { id: 'reporting', label: 'Reporting', icon: BarChart3, adminOnly: true },
        { id: 'security', label: 'Security', icon: Shield, seniorPastorOnly: true },
      ],
    },
  ];

  const filteredSections = navigationSections.map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (item.seniorPastorOnly) return isSeniorPastor;
      if (item.adminOnly) return isAdmin || isSeniorPastor;
      return true;
    }),
  })).filter(section => section.items.length > 0);

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const userRole = isSeniorPastor ? 'Senior Pastor' : isAdmin ? 'Administrator' : 'Volunteer';

  return (
    <aside className={`modern-sidebar ${collapsed ? 'collapsed' : ''} ${className}`.trim()}>
      <div className="modern-sidebar-header">
        {!collapsed && (
          <>
            <div className="flex items-center gap-3 flex-1">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl text-white font-bold text-lg shadow-lg" style={{ background: 'linear-gradient(135deg, #0d9488, #f59e0b)' }}>
                L
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base" style={{ fontFamily: 'Lexend, sans-serif', letterSpacing: '-0.02em', color: '#ffffff' }}>LifeGate</span>
                <span className="text-xs font-medium" style={{ color: 'rgba(255, 255, 255, 0.78)' }}>Workspace</span>
              </div>
            </div>
          </>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg transition-colors"
          style={{
            color: '#ffffff',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.18)'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.12)'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <div className="modern-sidebar-content">
        {filteredSections.length > 0 ? (
          filteredSections.map((section) => (
            <div key={section.title} className="nav-section">
              {!collapsed && <div className="nav-section-title">{section.title}</div>}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeApp === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveApp(item.id)}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="nav-item-icon" />
                      {!collapsed && <span>{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-white text-sm">Loading...</div>
        )}
      </div>

      <div className="modern-sidebar-footer">
        <div className="flex flex-col gap-2">
          {!collapsed && (
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.16)' }}>
              <div className="flex items-center justify-center w-8 h-8 rounded-lg text-white font-bold text-sm flex-shrink-0" style={{ background: 'linear-gradient(135deg, #ec4899, #0d9488)' }}>
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col overflow-hidden flex-1">
                <span className="text-sm font-bold truncate" style={{ color: '#ffffff' }}>{displayName}</span>
                <span className="text-xs truncate font-medium" style={{ color: 'rgba(255, 255, 255, 0.72)' }}>{userRole}</span>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={onSettings}
              className="flex-1 p-2 rounded-lg transition-colors"
              style={{
                color: '#ffffff',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.18)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.12)'}
              title="Settings"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={onLogout}
              className="flex-1 p-2 rounded-lg transition-colors"
              style={{
                color: '#ffffff',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.18)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.12)'}
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
