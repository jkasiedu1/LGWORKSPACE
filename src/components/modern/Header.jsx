import { Search, Bell, Menu } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ThemeSwitcher from './ThemeSwitcher';

export default function Header({ activeApp, searchQuery, setSearchQuery, onMenuClick }) {
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const notificationRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

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

        <div className="relative" ref={notificationRef}>
          <button
            className="btn-ghost p-2 rounded-lg relative"
            aria-label="Notifications"
            aria-expanded={showNotifications}
            onClick={() => {
              setShowNotifications((prev) => !prev);
              setHasUnread(false);
            }}
          >
            <Bell size={20} />
            {hasUnread && <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full shadow-lg"></span>}
          </button>

          {showNotifications && (
            <div
              className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden z-50"
              role="dialog"
              aria-label="Notifications panel"
            >
              <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
                <p className="text-sm font-semibold text-stone-800">Notifications</p>
              </div>
              <div className="p-4 space-y-3">
                <div className="text-sm text-stone-700">No new notifications right now.</div>
                <div className="text-xs text-stone-400">You are all caught up.</div>
              </div>
            </div>
          )}
        </div>
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
