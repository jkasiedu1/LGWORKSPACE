import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
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
          setActiveApp('people');
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
    </div>
  );
}
