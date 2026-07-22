import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { useAuth } from './hooks/useAuth';
import { useAppData } from './hooks/useAppData';
import { configureAIPolicy } from './lib/gemini';
import ErrorBoundary from './components/ErrorBoundary';
import LoginScreen from './apps/LoginScreen';
import DirectoryIntakeApp from './apps/DirectoryIntakeApp';

// Modern Components
import Sidebar from './components/modern/Sidebar';
import Header from './components/modern/Header';

// Apps - Using Modern Home
import ModernHomeApp from './apps/ModernHomeApp';
import CommunityApp from './apps/CommunityApp';
import ServicesApp from './apps/ServicesApp';
import MusicApp from './apps/MusicApp';
import PeopleApp from './apps/PeopleApp';
import GivingApp from './apps/GivingApp';
import CalendarApp from './apps/CalendarApp';
import TeamsApp from './apps/TeamsApp';
import WorkflowsApp from './apps/WorkflowsApp';
import SecurityApp from './apps/SecurityApp';
import ReportingApp from './apps/ReportingApp';

export default function App() {
  // Authentication
  const { user, loading: authLoading, isAuthenticated, roleAccess, logout } = useAuth();
  const { isSeniorPastor, isAdmin } = roleAccess;
  
  // Data
  const appData = useAppData(isAuthenticated, isAdmin || isSeniorPastor);

  // Routing
  const navigate = useNavigate();
  const location = useLocation();
  const isPublicDirectoryIntakeRoute = location.pathname === '/directory-intake';
  const activeApp = location.pathname.replace('/', '') || 'home';
  const setActiveApp = (appId) => navigate(appId === 'home' ? '/' : `/${appId}`);

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const handleOpenProfile = () => {
    setProfileNameInput(user?.displayName || '');
    setIsProfileOpen(true);
  };

  const handleSaveProfileName = async () => {
    const name = profileNameInput.trim();
    if (!name || !user) return;
    setProfileSaving(true);
    try {
      await updateProfile(user, { displayName: name });
      setIsProfileOpen(false);
      console.log('Display name updated.');
    } catch (err) {
      console.error('Failed to update display name:', err);
    } finally {
      setProfileSaving(false);
    }
  };

  // Configure AI Policy
  useEffect(() => {
    configureAIPolicy(appData.securitySettings);
  }, [appData.securitySettings]);

  // Auto-logout on inactivity (15 minutes)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    let timeoutId;
    const inactivityLimit = 15 * 60 * 1000;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (user) logout().catch((err) => console.error('Auto-logout failed:', err));
      }, inactivityLimit);
    };

    resetTimer();
    const eventNames = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    eventNames.forEach((eventName) => window.addEventListener(eventName, resetTimer));

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      eventNames.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [isAuthenticated, user, logout]);

  // Public directory intake route
  if (isPublicDirectoryIntakeRoute) {
    return <DirectoryIntakeApp />;
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loader2 className="animate-spin text-neutral-400" size={48} />
      </div>
    );
  }

  // Not authenticated - show login
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Legacy theme for apps that still use it
  const legacyTheme = {
    name: 'Modern',
    color: 'text-teal-700',
    light: 'bg-teal-50',
    bg: 'bg-teal-600',
    bgGradient: 'from-teal-50 to-cyan-50',
  };

  return (
    <div className={`modern-app ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
      <Sidebar
        className={mobileMenuOpen ? 'mobile-open' : ''}
        activeApp={activeApp}
        setActiveApp={(appId) => {
          setActiveApp(appId);
          if (window.innerWidth <= 1023) setMobileMenuOpen(false);
        }}
        onSettings={() => {
          if (isAdmin || isSeniorPastor) {
            setActiveApp('security');
          } else {
            setActiveApp('people');
          }
          if (window.innerWidth <= 1023) setMobileMenuOpen(false);
        }}
        onProfileClick={() => {
          handleOpenProfile();
          if (window.innerWidth <= 1023) setMobileMenuOpen(false);
        }}
        user={user}
        onLogout={logout}
        isAdmin={isAdmin}
        isSeniorPastor={isSeniorPastor}
      />
      {mobileMenuOpen && window.innerWidth <= 1023 && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="modern-main">
        <Header
          activeApp={activeApp}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        <main className="modern-content">
          <ErrorBoundary>
            {activeApp === 'home' && (
              <ModernHomeApp
                events={appData.events}
                people={appData.people}
                isAdmin={isAdmin}
                isSeniorPastor={isSeniorPastor}
                setActiveApp={setActiveApp}
                loadingPeople={appData.loadingPeople}
                loadingEvents={appData.loadingEvents}
                user={user}
              />
            )}
            {activeApp === 'community' && (
              <CommunityApp
                theme={legacyTheme}
                people={appData.people}
                posts={appData.communityPosts}
                setPosts={appData.setCommunityPosts}
                showToast={(msg) => console.log(msg)}
                user={user}
                roleAccess={roleAccess}
              />
            )}
            {activeApp === 'services' && (
              <ServicesApp
                theme={legacyTheme}
                planItems={appData.planItems}
                setPlanItems={appData.setPlanItems}
                servicePlan={appData.servicePlan}
                setServicePlan={appData.setServicePlan}
                isAdmin={isAdmin}
                showToast={(msg) => console.log(msg)}
              />
            )}
            {activeApp === 'music' && (
              <MusicApp
                theme={legacyTheme}
                isAdmin={isAdmin}
                songs={appData.songs}
                setSongs={appData.setSongs}
                globalSearch={searchQuery}
                showToast={(msg) => console.log(msg)}
              />
            )}
            {activeApp === 'teams' && (
              <TeamsApp
                theme={legacyTheme}
                teamsList={appData.teamsList}
                setTeamsList={appData.setTeamsList}
                people={appData.people}
                setActiveApp={setActiveApp}
                isAdmin={isAdmin}
                showToast={(msg) => console.log(msg)}
                globalSearch={searchQuery}
                user={user}
              />
            )}
            {activeApp === 'people' && (
              <PeopleApp
                theme={legacyTheme}
                people={appData.people}
                setPeople={appData.setPeople}
                isAdmin={isAdmin}
                globalSearch={searchQuery}
                showToast={(msg) => console.log(msg)}
                loadingPeople={appData.loadingPeople}
                intakeSubmissions={appData.intakeSubmissions}
                loadingIntakeSubmissions={appData.loadingIntakeSubmissions}
              />
            )}
            {activeApp === 'giving' && (isAdmin || roleAccess.appAccess?.includes('giving')) && (
              <GivingApp
                theme={legacyTheme}
                donations={appData.donations}
                setDonations={appData.setDonations}
                showToast={(msg) => console.log(msg)}
              />
            )}
            {activeApp === 'calendar' && (
              <CalendarApp
                theme={legacyTheme}
                events={appData.events}
                setEvents={appData.setEvents}
                isAdmin={isAdmin}
                showToast={(msg) => console.log(msg)}
              />
            )}
            {activeApp === 'workflows' && (isAdmin || roleAccess.appAccess?.includes('workflows')) && (
              <WorkflowsApp
                theme={legacyTheme}
                workflows={appData.workflows}
                setWorkflows={appData.setWorkflows}
                showToast={(msg) => console.log(msg)}
              />
            )}
            {activeApp === 'security' && isAdmin && (
              <SecurityApp
                theme={legacyTheme}
                isSeniorPastor={isSeniorPastor}
                securitySettings={appData.securitySettings}
                setSecuritySettings={appData.setSecuritySettings}
                showToast={(msg) => console.log(msg)}
              />
            )}
            {activeApp === 'reporting' && (isAdmin || roleAccess.appAccess?.includes('reporting')) && (
              <ReportingApp
                theme={legacyTheme}
                people={appData.people}
                donations={appData.donations}
                events={appData.events}
                teamsList={appData.teamsList}
              />
            )}
          </ErrorBoundary>
        </main>
      </div>

      {isProfileOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setIsProfileOpen(false)}>
          <div className="w-full max-w-sm rounded-xl bg-white border border-stone-200 shadow-2xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-stone-900">Edit Display Name</h3>
              <button onClick={() => setIsProfileOpen(false)} className="text-stone-400 hover:text-stone-600" aria-label="Close">x</button>
            </div>
            <p className="text-xs text-stone-500 mb-2">{user?.email}</p>
            <input
              type="text"
              value={profileNameInput}
              onChange={(e) => setProfileNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveProfileName();
                if (e.key === 'Escape') setIsProfileOpen(false);
              }}
              placeholder="Your full name"
              autoFocus
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500 mb-3"
            />
            <button
              onClick={handleSaveProfileName}
              disabled={profileSaving || !profileNameInput.trim()}
              className="w-full bg-stone-900 text-white text-xs font-semibold py-2 rounded-lg hover:bg-stone-800 disabled:opacity-50 transition-colors"
            >
              {profileSaving ? 'Saving...' : 'Save Name'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
