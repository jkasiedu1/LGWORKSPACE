import { Search, Bell, Menu } from 'lucide-react';
import { useState } from 'react';
import ThemeSwitcher from './ThemeSwitcher';

export default function Header({ activeApp, searchQuery, setSearchQuery, onMenuClick }) {
  const [showSearch, setShowSearch] = useState(false);

  const appTitles = {
    home: 'Home',
    people: 'People Directory',
    calendar: 'Calendar & Events',
    giving: 'Giving Management',
    services: 'Services & Worship',
    music: 'Music Ministry',
    community: 'Community Connect',
    teams: 'Teams & Groups',
    workflows: 'Workflows & Automation',
    reporting: 'Reports & Analytics',
    security: 'Security & Access',
    directoryIntake: 'Directory Intake',
  };

  return (
    <header className="modern-header">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-opacity-10 transition-colors"
          style={{
            color: '#ffffff',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
        <h1 className="text-xl font-semibold" style={{ color: '#ffffff' }}>
          {appTitles[activeApp] || 'Workspace'}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 px-4 py-2 pl-10 text-sm rounded-lg focus:outline-none"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              color: 'rgba(248, 246, 242, 0.96)',
              WebkitTextFillColor: 'rgba(248, 246, 242, 0.96)',
              caretColor: '#ffffff',
            }}
          />
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(248, 246, 242, 0.62)' }} />
        </div>

        <button
          className="md:hidden btn-ghost p-2 rounded-lg relative"
          onClick={() => setShowSearch(!showSearch)}
          aria-label="Search"
        >
          <Search size={20} />
        </button>

        <ThemeSwitcher />

        <button className="btn-ghost p-2 rounded-lg relative" aria-label="Notifications">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full shadow-lg"></span>
        </button>
      </div>

      {showSearch && (
        <div className="absolute top-full left-0 right-0 p-4 glass-panel md:hidden" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(28, 25, 23, 0.62)' }} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 text-sm rounded-lg focus:outline-none"
              style={{
                background: 'rgba(255, 255, 255, 0.94)',
                border: '1px solid rgba(120, 113, 108, 0.3)',
                color: '#1c1917',
                WebkitTextFillColor: '#1c1917',
                caretColor: '#1c1917',
              }}
            />
          </div>
        </div>
      )}
    </header>
  );
}
