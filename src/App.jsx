import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Users, BookOpen, MessageSquare, LayoutDashboard, 
  Sparkles, ChevronRight, Clock, CheckCircle2, AlertCircle, Settings, Bell, 
  Search, Plus, MoreVertical, CalendarDays, Mail, Smartphone, Send, Loader2, 
  UserPlus, Filter, MoreHorizontal, Grid, ChevronDown, GripVertical, Workflow, 
  Music, UploadCloud, FileText, FileAudio, ListMusic, Mic2, DollarSign, 
  ShieldCheck, TrendingUp, CreditCard, Inbox, Hash, UserCheck, ToggleRight, 
  ToggleLeft, ShieldAlert, Play, Pause, SkipBack, SkipForward, MonitorPlay, 
  FolderLock, Lock, Unlock, File, SmartphoneNfc, EyeOff, History, PieChart, 
  BarChart3, Download, TrendingDown, Activity, LogOut 
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';

// 👇 1. YOUR FIREBASE KEYS 👇
const firebaseConfig = {
  apiKey: "AIzaSyCrPxPLMS_pwryIRHoxYVUFiuxpKHyTk1M",
  authDomain: "lifegate-workspace-5dd48.firebaseapp.com",
  projectId: "lifegate-workspace-5dd48",
  storageBucket: "lifegate-workspace-5dd48.firebasestorage.app",
  messagingSenderId: "747638028505",
  appId: "1:747638028505:web:e0abb11d1ea0505c5526c8"
};

let db = null;
let auth = null;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (e) {
  console.warn("Firebase not fully initialized. Check your keys.");
}

// 👇 2. ROLE-BASED ACCESS CONTROL (RBAC) 👇
// The Senior Pastor has ultimate access and a unique badge.
const SENIOR_PASTOR_EMAIL = 'bigjoe11221985@gmail.com';

// Admins have full access to manage data. Everyone else gets limited Volunteer access.
const ADMIN_EMAILS = [
  'jkasiedu1@gmail.com' 
];

// --- ENTERPRISE MOCK DATA ---
const UPCOMING_EVENTS = [
  { id: 1, title: 'Ash Wednesday Gathering', date: 'Feb 18, 2026', time: '7:00 PM', type: 'Worship' },
  { id: 2, title: 'Sunday Worship Experience', date: 'Feb 22, 2026', time: '10:00 AM', type: 'Weekend Service' },
  { id: 3, title: 'Serve Team Rally', date: 'Feb 28, 2026', time: '9:00 AM', type: 'Equipping' },
  { id: 4, title: 'Easter Creative Sync', date: 'Mar 5, 2026', time: '1:00 PM', type: 'Collaboration' },
];

const PEOPLE_LIST = [
  { id: 1, name: 'Sarah Jenkins', email: 'sarah.j@example.com', phone: '(555) 123-4567', address: '123 Meadow Ln, Heartland, TX', type: 'Guest', bgCheck: 'N/A' },
  { id: 2, name: 'The Martinez Family', email: 'martinez@example.com', phone: '(555) 987-6543', address: '456 Oak Dr, Heartland, TX', type: 'Member', bgCheck: 'N/A' },
  { id: 3, name: 'David Chen', email: 'dchen88@example.com', phone: '(555) 456-7890', address: '789 Pine St, Heartland, TX', type: 'Volunteer', bgCheck: 'Clear' },
  { id: 4, name: 'Emily Thorne', email: 'emily.t@example.com', phone: '(555) 321-0987', address: '321 Elm Ct, Heartland, TX', type: 'Staff', bgCheck: 'Pending' },
  { id: 5, name: 'Marcus Johnson', email: 'marcus.j@example.com', phone: '(555) 654-3210', address: '654 Maple Ave, Heartland, TX', type: 'Volunteer', bgCheck: 'Expired' },
];

const PLAN_ITEMS = [
  { id: 1, time: '7:00 PM', length: '5:00', title: 'Welcome & Vision', type: 'Element', person: 'Pastor Joshua' },
  { id: 2, time: '7:05 PM', length: '15:00', title: 'Worship Set (3 Songs)', type: 'Song', person: 'Worship Band' },
  { id: 3, time: '7:20 PM', length: '5:00', title: 'Guided Prayer Moment', type: 'Element', person: 'Elder Team' },
  { id: 4, time: '7:25 PM', length: '35:00', title: 'Message: Beauty from Ashes', type: 'Sermon', person: 'Pastor Joshua' },
  { id: 5, time: '8:00 PM', length: '15:00', title: 'Imposition of Ashes / Response', type: 'Element', person: 'All Staff' },
];

const SONG_LIBRARY = [
  { id: 1, title: 'Build My Life', artist: 'Housefires', key: 'G', originalKey: 'G', bpm: 70, ccli: '7070345', lastPlayed: 'Feb 1', hasLyrics: true, hasChords: true, hasAudio: true },
  { id: 2, title: 'What A Beautiful Name', artist: 'Hillsong Worship', key: 'D', originalKey: 'D', bpm: 68, ccli: '7068424', lastPlayed: 'Jan 25', hasLyrics: true, hasChords: true, hasAudio: false },
  { id: 3, title: 'Graves Into Gardens', artist: 'Elevation Worship', key: 'B', originalKey: 'B', bpm: 70, ccli: '7138219', lastPlayed: 'Feb 8', hasLyrics: true, hasChords: false, hasAudio: true },
];

const RECENT_DONATIONS = [
  { id: 1, name: 'Anonymous', amount: '$500.00', date: 'Feb 16, 2026', fund: 'General Tithe', type: 'Zelle' },
  { id: 2, name: 'David Chen', amount: '$150.00', date: 'Feb 15, 2026', fund: 'Missions', type: 'Online Recurring' },
  { id: 3, name: 'Emily Thorne', amount: '$250.00', date: 'Feb 15, 2026', fund: 'Building Fund', type: 'Zelle' },
];

const MINISTRY_TEAMS = [
  { id: 1, name: 'Men\'s Ministry', lead: 'Michael Carter', members: 42, access: 'Full Admin', status: 'unlocked', desc: 'Manage men\'s breakfasts, retreats, and mentorship groups.' },
  { id: 2, name: 'Women\'s Ministry', lead: 'Sarah Jenkins', members: 56, access: 'View Only', status: 'restricted', desc: 'Coordinate Bible studies, women\'s events, and support groups.' },
  { id: 3, name: 'Lifegate Youth', lead: 'David Chen', members: 18, access: 'Full Admin', status: 'unlocked', desc: 'Youth group scheduling, parent communications, and camp planning.' },
  { id: 4, name: 'Lifegate Kids', lead: 'Emily Thorne', members: 35, access: 'View Only', status: 'restricted', desc: 'Children\'s curriculum, check-in data, and background checks.' },
  { id: 5, name: 'Lifegate Music', lead: 'Marcus Johnson', members: 24, access: 'Full Admin', status: 'unlocked', desc: 'Worship sets, band schedules, and rehearsal resources.' },
  { id: 6, name: 'Lifegate Media', lead: 'James Wilson', members: 12, access: 'No Access', status: 'locked', desc: 'A/V scheduling, stage plots, and livestream management.' },
  { id: 7, name: 'Lifegate Ushers and Protocol', lead: 'Robert Hayes', members: 28, access: 'No Access', status: 'locked', desc: 'Service protocols, seating logistics, and offering collection.' },
  { id: 8, name: 'Lifegate Hospitality', lead: 'Linda Gomez', members: 30, access: 'View Only', status: 'restricted', desc: 'Coffee bar, guest welcome packages, and event catering.' },
  { id: 9, name: 'Lifegate Sunday Prayer Team', lead: 'Pastor Joshua', members: 15, access: 'Full Admin', status: 'unlocked', desc: 'Altar ministry schedules and confidential prayer requests.' },
  { id: 10, name: 'Lifegate Friday Prayer Team', lead: 'Anna Roberts', members: 20, access: 'No Access', status: 'locked', desc: 'Intercessory prayer focus lists and Friday night watch schedules.' },
  { id: 11, name: 'Lifegate Outreach and Follow-Up', lead: 'Tom Harris', members: 25, access: 'View Only', status: 'restricted', desc: 'Community service events, evangelism, and guest retention tracking.' },
  { id: 12, name: 'Lifegate Board', lead: 'Elder Council', members: 7, access: 'Full Admin', status: 'unlocked', desc: 'Financial reports, strategic planning, and governance documents.' },
  { id: 13, name: 'Lifegate Communications', lead: 'Jessica Lee', members: 8, access: 'No Access', status: 'locked', desc: 'Social media planning, website updates, and bulletin announcements.' },
];

const APPS = {
  home: { id: 'home', name: 'Home', color: 'text-stone-700', bg: 'bg-stone-800', light: 'bg-stone-100', border: 'border-stone-200', icon: LayoutDashboard },
  services: { id: 'services', name: 'Services', color: 'text-amber-600', bg: 'bg-amber-600', light: 'bg-amber-50', border: 'border-amber-200', icon: BookOpen },
  music: { id: 'music', name: 'Music', color: 'text-rose-600', bg: 'bg-rose-600', light: 'bg-rose-50', border: 'border-rose-200', icon: Music },
  teams: { id: 'teams', name: 'Team Portals', color: 'text-indigo-600', bg: 'bg-indigo-600', light: 'bg-indigo-50', border: 'border-indigo-200', icon: FolderLock },
  people: { id: 'people', name: 'People', color: 'text-sky-600', bg: 'bg-sky-600', light: 'bg-sky-50', border: 'border-sky-200', icon: Users },
  giving: { id: 'giving', name: 'Giving', color: 'text-teal-600', bg: 'bg-teal-600', light: 'bg-teal-50', border: 'border-teal-200', icon: DollarSign },
  calendar: { id: 'calendar', name: 'Calendar', color: 'text-orange-500', bg: 'bg-orange-500', light: 'bg-orange-50', border: 'border-orange-200', icon: CalendarIcon },
  workflows: { id: 'workflows', name: 'Workflows', color: 'text-violet-600', bg: 'bg-violet-600', light: 'bg-violet-50', border: 'border-violet-200', icon: Workflow },
  security: { id: 'security', name: 'Security', color: 'text-stone-600', bg: 'bg-stone-800', light: 'bg-stone-100', border: 'border-stone-300', icon: ShieldCheck },
  reporting: { id: 'reporting', name: 'Insights', color: 'text-fuchsia-600', bg: 'bg-fuchsia-600', light: 'bg-fuchsia-50', border: 'border-fuchsia-200', icon: PieChart }
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  
  // ROLE STATE
  const [isSeniorPastor, setIsSeniorPastor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false); 
  
  const [activeApp, setActiveApp] = useState('home');
  const [isAppSwitcherOpen, setIsAppSwitcherOpen] = useState(false);
  
  // LIVE & LOCAL STATE
  const [events, setEvents] = useState(UPCOMING_EVENTS);
  const [people, setPeople] = useState(PEOPLE_LIST);
  const [planItems, setPlanItems] = useState(PLAN_ITEMS);
  const [donations, setDonations] = useState(RECENT_DONATIONS); // Lifted state for Giving
  
  // LIVE FIREBASE AUTH STATE & ROLE ASSIGNMENT
  useEffect(() => {
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setIsAuthenticated(!!user);
        if (user && user.email) {
          const userEmail = user.email.toLowerCase();
          const seniorPastor = userEmail === SENIOR_PASTOR_EMAIL.toLowerCase();
          const admin = seniorPastor || ADMIN_EMAILS.map(e=>e.toLowerCase()).includes(userEmail);
          
          setIsSeniorPastor(seniorPastor);
          setIsAdmin(admin);
        } else {
          setIsSeniorPastor(false);
          setIsAdmin(false);
        }
        setAuthCheckComplete(true);
      });
      return () => unsubscribe();
    } else {
      setAuthCheckComplete(true);
    }
  }, []);

  // INACTIVITY AUTO-LOGOUT (15 Minutes)
  useEffect(() => {
    let timeoutId;
    const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes in milliseconds

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (auth && auth.currentUser) {
          console.log("Logged out due to inactivity.");
          signOut(auth);
        }
      }, INACTIVITY_LIMIT);
    };

    if (isAuthenticated) {
      resetTimer(); // Start timer on login
      
      // Watch for any interactions
      const eventsListener = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
      eventsListener.forEach(event => window.addEventListener(event, resetTimer));

      // Cleanup
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        eventsListener.forEach(event => window.removeEventListener(event, resetTimer));
      };
    }
  }, [isAuthenticated]);

  // Sync with Firestore (if available)
  useEffect(() => {
    let unsubEvents;
    let unsubPeople;
    
    if (isAuthenticated && db) {
      unsubEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
        if (!snapshot.empty) setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      unsubPeople = onSnapshot(collection(db, 'people'), (snapshot) => {
        if (!snapshot.empty) setPeople(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    return () => {
      if (unsubEvents) unsubEvents();
      if (unsubPeople) unsubPeople();
    };
  }, [isAuthenticated]);

  // Inject Custom Fonts
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
      body { background-color: #fafaf9 !important; color: #1c1917 !important; font-family: 'Inter', sans-serif !important; }
      ::selection { background-color: #99f6e4 !important; }
      .font-sans { font-family: 'Inter', sans-serif !important; }
      .font-serif { font-family: 'Playfair Display', serif !important; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const theme = APPS[activeApp];

  if (!authCheckComplete) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50"><Loader2 className="animate-spin text-stone-400" size={32} /></div>;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // CORE RBAC LOGIC: Hide sensitive apps from non-admins
  const visibleApps = Object.values(APPS).filter(app => {
    if (!isAdmin && ['security', 'reporting', 'giving', 'workflows'].includes(app.id)) return false;
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 font-sans">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <div className="relative">
              <button onClick={() => setIsAppSwitcherOpen(!isAppSwitcherOpen)} className={`flex items-center gap-2 font-semibold text-lg tracking-tight hover:opacity-80 transition-opacity ${theme.color}`}>
                <Grid size={20} className="text-stone-400" />
                <div className="flex flex-col items-start leading-none mt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-stone-900 font-serif font-bold text-lg leading-none">Lifegate AG</span>
                    
                    {/* DYNAMIC ROLE BADGE */}
                    <div className={`hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-full border ml-1 ${isSeniorPastor ? 'bg-indigo-50 border-indigo-200' : isAdmin ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-100 border-stone-200'}`}>
                      {isSeniorPastor ? <Sparkles size={10} className="text-indigo-500" /> : isAdmin ? <ShieldCheck size={10} className="text-emerald-500" /> : <Users size={10} className="text-stone-500" />}
                      <span className={`text-[8px] font-bold uppercase tracking-wider ${isSeniorPastor ? 'text-indigo-700' : isAdmin ? 'text-emerald-700' : 'text-stone-600'}`}>
                        {isSeniorPastor ? 'Lead Pastor' : isAdmin ? 'Admin' : 'Volunteer'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-stone-400 mt-0.5">{theme.name}</span>
                </div>
                <ChevronDown size={16} className="text-stone-400 ml-1" />
              </button>
              
              {isAppSwitcherOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsAppSwitcherOpen(false)}></div>
                  <div className="absolute top-full left-0 mt-3 w-72 bg-white rounded-xl shadow-xl border border-stone-200 p-3 grid grid-cols-3 gap-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {visibleApps.map((app) => {
                      const Icon = app.icon;
                      return (
                        <button key={app.id} onClick={() => { setActiveApp(app.id); setIsAppSwitcherOpen(false); }} className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg hover:bg-stone-50 transition-colors ${activeApp === app.id ? 'bg-stone-50 ring-1 ring-stone-200' : ''}`}>
                          <Icon size={24} className={app.color} />
                          <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider">{app.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 h-4 w-4 group-focus-within:text-teal-600 transition-colors" />
              <input type="text" placeholder="Search across all apps..." className="w-full pl-9 pr-4 py-1.5 bg-stone-100 border border-transparent rounded-md text-sm focus:bg-white focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-all outline-none" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative text-stone-400 hover:text-stone-600 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 h-2 w-2 bg-amber-500 border border-white rounded-full"></span>
            </button>
            {isAdmin && (
              <button className={`text-stone-400 hover:text-stone-600 transition-colors ${activeApp === 'security' ? 'text-stone-800' : ''}`} onClick={() => setActiveApp('security')}>
                <Settings className="h-5 w-5" />
              </button>
            )}
            <div className={`h-8 w-8 rounded-full text-white flex items-center justify-center text-xs font-bold shadow-sm cursor-pointer hover:ring-2 ring-stone-300 ring-offset-2 transition-all ${isSeniorPastor ? 'bg-indigo-600' : 'bg-stone-900'}`}>
              {isSeniorPastor ? 'SP' : isAdmin ? 'AD' : 'VU'}
            </div>
            <button onClick={() => auth && signOut(auth)} className="text-stone-400 hover:text-rose-600 transition-colors ml-2" title="Logout">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {activeApp === 'home' && <HomeApp events={events} people={people} isAdmin={isAdmin} isSeniorPastor={isSeniorPastor} setActiveApp={setActiveApp} />}
        {activeApp === 'services' && <ServicesApp theme={theme} planItems={planItems} setPlanItems={setPlanItems} isAdmin={isAdmin} />}
        {activeApp === 'music' && <MusicApp theme={theme} isAdmin={isAdmin} />}
        {activeApp === 'teams' && <TeamsApp theme={theme} setActiveApp={setActiveApp} isAdmin={isAdmin} />}
        {activeApp === 'people' && <PeopleApp theme={theme} people={people} setPeople={setPeople} isAdmin={isAdmin} />}
        {activeApp === 'giving' && isAdmin && <GivingApp theme={theme} donations={donations} setDonations={setDonations} />}
        {activeApp === 'calendar' && <CalendarApp theme={theme} events={events} setEvents={setEvents} isAdmin={isAdmin} />}
        {activeApp === 'workflows' && isAdmin && <WorkflowsApp theme={theme} />}
        {activeApp === 'security' && isAdmin && <SecurityApp theme={theme} isSeniorPastor={isSeniorPastor} />}
        {activeApp === 'reporting' && isAdmin && <ReportingApp theme={theme} />}
      </main>
    </div>
  );
}

// ==========================================
// APP MODULES
// ==========================================

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      if (auth) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        setErrorMsg("Firebase Auth not connected.");
        setIsLoading(false);
      }
    } catch (error) {
      setErrorMsg("Invalid email or password. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-stone-200">
        <div className="text-center">
          <div className="flex justify-center items-center gap-2 mb-2">
            <Grid size={32} className="text-stone-800" />
          </div>
          <h2 className="mt-2 text-center text-3xl font-serif font-bold tracking-tight text-stone-900">Lifegate AG</h2>
          <p className="mt-2 text-center text-sm text-stone-500 font-medium">Workspace & Ministry Portal</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wide">Email Address</label>
              <input 
                type="email" 
                required 
                className="relative block w-full rounded-lg border border-stone-300 px-3 py-2.5 text-stone-900 focus:z-10 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 sm:text-sm transition-colors" 
                placeholder="name@example.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wide">Password</label>
              <input
                type="password"
                required
                className="relative block w-full rounded-lg border border-stone-300 px-3 py-2.5 text-stone-900 focus:z-10 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 sm:text-sm transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {errorMsg && (
            <div className="bg-rose-50 text-rose-600 text-sm p-3 rounded-lg flex items-center gap-2 font-medium">
              <AlertCircle size={16} />
              {errorMsg}
            </div>
          )}

          <div>
            <button type="submit" disabled={isLoading || !email || !password} className="group relative flex w-full justify-center rounded-lg bg-stone-900 px-3 py-3 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-70 transition-all">
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Sign in to Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function HomeApp({ events, people, isAdmin, isSeniorPastor, setActiveApp }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-left">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">
            {isSeniorPastor ? 'Good Morning, Pastor' : isAdmin ? 'Good Morning, Admin' : 'Welcome back, Volunteer'}
          </h1>
          <p className="text-stone-500 text-sm mt-1">Here is your ministry pulse for the week of Feb 16, 2026.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <HomeMetricCard title="Upcoming Services" value={events.length} label="Scheduled" color="text-amber-600" />
        <HomeMetricCard title="Total Profiles" value={people.length} label="In Database" color="text-sky-600" />
        <HomeMetricCard title="Serve Team" value="82%" label="Filled for Sunday" color="text-orange-600" />
        {isAdmin && <HomeMetricCard title="Weekly Giving" value="$14.2k" label="Ahead of Goal" color="text-teal-600" />}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
            <h2 className="font-semibold text-stone-800">Your Schedule</h2>
            <button onClick={() => setActiveApp('calendar')} className="text-sm text-stone-500 hover:text-stone-800 font-medium">View Calendar</button>
          </div>
          <div className="divide-y divide-stone-100 flex-1">
            {events.slice(0, 4).map(event => (
              <div key={event.id} className="p-4 hover:bg-stone-50 transition-colors flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-stone-900 text-sm">{event.title}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-stone-500"><span>{event.date}</span><span>•</span><span>{event.time}</span></div>
                </div>
                <ChevronRight size={16} className="text-stone-400" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/50">
            <h2 className="font-semibold text-stone-800">Quick Actions</h2>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <QuickActionButton icon={BookOpen} label="View Services" color="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200" onClick={() => setActiveApp('services')} />
            {isAdmin && <QuickActionButton icon={UserPlus} label="Add a Person" color="bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200" onClick={() => setActiveApp('people')} />}
            {isAdmin && <QuickActionButton icon={DollarSign} label="Zelle Sync" color="bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200" onClick={() => setActiveApp('giving')} />}
            {isAdmin && <QuickActionButton icon={Send} label="Send Message" color="bg-violet-50 text-violet-700 hover:bg-violet-100 border-violet-200" onClick={() => setActiveApp('workflows')} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function ServicesApp({ theme, planItems, setPlanItems, isAdmin }) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ time: '', length: '', title: '', type: 'Element', person: '' });

  const handleGenerate = () => {
    if (!prompt) return;
    setIsGenerating(true); setResult(null);
    setTimeout(() => {
      setIsGenerating(false);
      setResult(`**Teaching Guide: Beauty from Ashes**\n\n**1. The Call to Return (Joel 2)** \n- Unpack the historical context of rending hearts, not garments.\n- Key Takeaway: True life change is internal.\n\n**2. The Hidden Devotion (Matthew 6)**\n- Contrast cultural performative fasting with secret devotion.\n\n**3. The Imposition of Ashes**\n- Acknowledging our humanity ("Dust you are...").`);
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Ash Wednesday Gathering</h1>
          <p className="text-stone-500 text-sm mt-1">Feb 18, 2026 • 7:00 PM • Main Auditorium</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-stone-200 rounded-md text-sm font-medium text-stone-700 hover:bg-stone-50 shadow-sm">Print</button>
          {isAdmin && <button className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90`}>Save Plan</button>}
        </div>
      </div>
      <div className="border-b border-stone-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <a href="#" className={`border-b-2 ${theme.border} ${theme.color} py-4 px-1 text-sm font-medium`}>Order</a>
          <a href="#" className="border-b-2 border-transparent text-stone-500 hover:text-stone-700 py-4 px-1 text-sm font-medium">Teams</a>
          <a href="#" className="border-b-2 border-transparent text-stone-500 hover:text-stone-700 py-4 px-1 text-sm font-medium">Times</a>
        </nav>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-medium">
                <tr><th className="px-4 py-3 w-8"></th><th className="px-4 py-3 w-24">Time</th><th className="px-4 py-3 w-20">Length</th><th className="px-4 py-3">Item</th><th className="px-4 py-3 w-32">Person</th><th className="px-4 py-3 w-8"></th></tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {planItems.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50 group">
                    <td className="px-4 py-3 text-stone-300">{isAdmin && <GripVertical size={16} className="cursor-move group-hover:text-stone-500" />}</td>
                    <td className="px-4 py-3 font-medium text-stone-900">{item.time}</td>
                    <td className="px-4 py-3 text-stone-500">{item.length}</td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2">{item.type === 'Song' && <span className={`w-2 h-2 rounded-full ${theme.bg}`}></span>}<span className="font-medium text-stone-900">{item.title}</span></div></td>
                    <td className="px-4 py-3 text-stone-500">{item.person}</td>
                    <td className="px-4 py-3 text-right">{isAdmin && <button onClick={() => setPlanItems(planItems.filter(i => i.id !== item.id))} className="text-stone-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><AlertCircle size={16}/></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isAdmin && (
            isAdding ? (
              <div className="p-4 border-t border-stone-100 bg-stone-50">
                <div className="grid grid-cols-5 gap-2 mb-3">
                  <input type="text" placeholder="Time" className="p-2 text-sm border border-stone-200 rounded outline-none" value={newItem.time} onChange={e => setNewItem({...newItem, time: e.target.value})} />
                  <input type="text" placeholder="Length" className="p-2 text-sm border border-stone-200 rounded outline-none" value={newItem.length} onChange={e => setNewItem({...newItem, length: e.target.value})} />
                  <input type="text" placeholder="Title" className="p-2 text-sm border border-stone-200 rounded outline-none" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} />
                  <select className="p-2 text-sm border border-stone-200 rounded outline-none" value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value})}>
                    <option value="Element">Element</option><option value="Song">Song</option><option value="Sermon">Sermon</option>
                  </select>
                  <input type="text" placeholder="Person" className="p-2 text-sm border border-stone-200 rounded outline-none" value={newItem.person} onChange={e => setNewItem({...newItem, person: e.target.value})} />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-200 rounded">Cancel</button>
                  <button onClick={() => { if(newItem.title) { setPlanItems([...planItems, { id: Date.now(), ...newItem }]); setIsAdding(false); setNewItem({ time: '', length: '', title: '', type: 'Element', person: '' }); } }} className={`px-3 py-1.5 text-sm text-white ${theme.bg} rounded hover:opacity-90`}>Save Item</button>
                </div>
              </div>
            ) : (
              <div className="p-4 border-t border-stone-100 bg-stone-50"><button onClick={() => setIsAdding(true)} className="text-sm font-medium text-stone-600 hover:text-stone-900 flex items-center gap-1"><Plus size={16}/> Add Item</button></div>
            )
          )}
        </div>
        {isAdmin && (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden flex flex-col h-fit">
            <div className={`${theme.bg} p-4 text-white flex justify-between items-center`}>
              <div className="flex items-center gap-2"><Sparkles size={18} className="text-white/80" /><h3 className="font-semibold">AI Assistant</h3></div>
              <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded uppercase tracking-wider">Gemini</span>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <textarea className="w-full p-3 border border-stone-200 rounded-lg text-sm focus:ring-1 focus:ring-amber-500 outline-none resize-none bg-stone-50" placeholder="Topic, text, or theme..." rows="3" value={prompt} onChange={(e) => setPrompt(e.target.value)}></textarea>
              <button onClick={handleGenerate} disabled={isGenerating || !prompt} className={`w-full py-2.5 ${theme.bg} text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity flex justify-center items-center gap-2 disabled:opacity-50`}>
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : 'Generate Guide'}
              </button>
              {result && (<div className="mt-2 p-4 bg-stone-50 border border-stone-100 rounded-lg text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{result}</div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MusicApp({ theme, isAdmin }) {
  const [musicPrompt, setMusicPrompt] = useState('');
  const [isAnalyzingMusic, setIsAnalyzingMusic] = useState(false);
  const [musicAnalysisResult, setMusicAnalysisResult] = useState(null);
  const [analysisMode, setAnalysisMode] = useState('vocals'); 
  const [selectedSong, setSelectedSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSongs = SONG_LIBRARY.filter(song => 
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    song.ccli.includes(searchQuery)
  );

  const handleMusicAnalysis = () => {
    if (!musicPrompt) return;
    setIsAnalyzingMusic(true); setMusicAnalysisResult(null);
    setTimeout(() => { setIsAnalyzingMusic(false); setMusicAnalysisResult(`**Analysis Complete**\n\nGemini has successfully broken down the requested track parameters. Your arrangement notes are ready to view.`); }, 1500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Music Library</h1>
          <p className="text-stone-500 text-sm mt-1">Manage songs, analyze arrangements, and view assets.</p>
        </div>
        <div className="flex gap-2">
          <button className={`px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-md text-sm font-medium shadow-sm hover:bg-stone-50 flex items-center gap-2`}><MonitorPlay size={16}/> Music Stand Mode</button>
          {isAdmin && <button className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}><UploadCloud size={16}/> Upload Song</button>}
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden h-fit">
            <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
              <h3 className="font-semibold text-stone-800">Song Catalog</h3>
              <div className="flex items-center gap-3">
                 <div className="relative hidden sm:block">
                   <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 h-3.5 w-3.5" />
                   <input type="text" placeholder="Search title or CCLI..." className="pl-8 pr-3 py-1.5 border border-stone-200 rounded-md text-xs outline-none focus:border-rose-500 w-48" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                 </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="border-b border-stone-100 text-stone-500 font-medium">
                  <tr><th className="px-5 py-3">Song Title</th><th className="px-5 py-3">Key / BPM</th><th className="px-5 py-3">CCLI #</th><th className="px-5 py-3">Assets</th></tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredSongs.map((song) => (
                    <tr key={song.id} onClick={() => setSelectedSong(song)} className={`cursor-pointer transition-colors ${selectedSong?.id === song.id ? 'bg-rose-50' : 'hover:bg-stone-50'}`}>
                      <td className="px-5 py-4"><div className="font-medium text-stone-900">{song.title}</div><div className="text-xs text-stone-500 mt-0.5">{song.artist}</div></td>
                      <td className="px-5 py-4 text-stone-500"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-700 mr-2 border border-stone-200">{song.key}</span><span className="text-xs">{song.bpm} bpm</span></td>
                      <td className="px-5 py-4 text-stone-500 text-xs">{song.ccli}<br/><span className="text-[10px] text-stone-400">Played: {song.lastPlayed}</span></td>
                      <td className="px-5 py-4"><div className="flex items-center gap-1.5">
                          <span className={`p-1.5 rounded-md ${song.hasLyrics ? 'bg-stone-100 text-stone-700' : 'bg-white text-stone-300 border border-stone-100'}`} title="Lyrics"><FileText size={14}/></span>
                          <span className={`p-1.5 rounded-md ${song.hasChords ? 'bg-stone-100 text-stone-700' : 'bg-white text-stone-300 border border-stone-100'}`} title="Chords"><Music size={14}/></span>
                          <span className={`p-1.5 rounded-md ${song.hasAudio ? 'bg-rose-100 text-rose-700' : 'bg-white text-stone-300 border border-stone-100'}`} title="Audio"><FileAudio size={14}/></span>
                      </div></td>
                    </tr>
                  ))}
                  {filteredSongs.length === 0 && (
                    <tr><td colSpan="4" className="px-5 py-8 text-center text-stone-500">No songs found matching "{searchQuery}"</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          {selectedSong ? (
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden h-fit flex flex-col animate-in slide-in-from-right-4 duration-300">
              <div className="p-5 border-b border-stone-100 bg-gradient-to-br from-stone-50 to-white flex justify-between items-start">
                <div><h2 className="font-bold text-lg text-stone-900 leading-tight">{selectedSong.title}</h2><p className="text-sm font-medium text-stone-500">{selectedSong.artist}</p></div>
                <button onClick={() => setSelectedSong(null)} className="text-stone-400 hover:text-stone-600 text-xs font-semibold uppercase tracking-wider">Close</button>
              </div>
              <div className="p-5 border-b border-stone-100 bg-stone-900 text-white">
                <div className="flex justify-between items-center mb-3"><span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Rehearsal Track</span><span className="text-xs font-medium bg-stone-800 px-2 py-0.5 rounded text-rose-400">0:00 / 4:12</span></div>
                <div className="w-full h-10 flex items-center gap-0.5 mb-4 opacity-70">
                   {Array.from({length: 40}).map((_, i) => (<div key={i} className="flex-1 bg-rose-500 rounded-full" style={{ height: `${Math.max(10, Math.random() * 100)}%` }}></div>))}
                </div>
                <div className="flex justify-center items-center gap-6">
                  <button className="text-stone-300 hover:text-white"><SkipBack size={20}/></button>
                  <button onClick={() => setIsPlaying(!isPlaying)} className="w-12 h-12 bg-white text-stone-900 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg">{isPlaying ? <Pause size={20} className="fill-current"/> : <Play size={20} className="fill-current ml-1"/>}</button>
                  <button className="text-stone-300 hover:text-white"><SkipForward size={20}/></button>
                </div>
              </div>
              <div className="p-4 bg-white flex flex-col gap-2">
                <button className="w-full py-2 bg-stone-100 text-stone-700 rounded-md text-sm font-semibold hover:bg-stone-200 transition-colors flex justify-center items-center gap-2"><FileText size={16}/> View Chord Chart</button>
              </div>
            </div>
          ) : (
            isAdmin && (
              <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden h-fit flex flex-col">
                <div className={`${theme.bg} p-4 text-white flex justify-between items-center`}><div className="flex items-center gap-2"><Sparkles size={18} className="text-white/80" /><h3 className="font-semibold">AI Music Analyzer</h3></div><span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded uppercase tracking-wider">Gemini</span></div>
                <div className="p-4 flex flex-col gap-4 flex-1">
                  <textarea className="w-full p-3 border border-stone-200 rounded-lg text-sm focus:ring-1 focus:ring-rose-500 outline-none resize-none bg-stone-50" placeholder="Paste lyrics or type a song title..." rows="3" value={musicPrompt} onChange={(e) => setMusicPrompt(e.target.value)}></textarea>
                  <button onClick={handleMusicAnalysis} disabled={isAnalyzingMusic || !musicPrompt} className={`w-full py-2.5 ${theme.bg} text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity flex justify-center items-center gap-2 disabled:opacity-50`}>
                    {isAnalyzingMusic ? <Loader2 size={16} className="animate-spin" /> : 'Analyze Track'}
                  </button>
                  {musicAnalysisResult && (<div className="mt-2 p-4 bg-stone-50 border border-stone-100 rounded-lg text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{musicAnalysisResult.split('**').map((text, i) => i % 2 === 1 ? <strong key={i} className="text-stone-900">{text}</strong> : text)}</div>)}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function PeopleApp({ theme, people, setPeople, isAdmin }) {
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newPerson, setNewPerson] = useState({ name: '', email: '', phone: '', address: '', type: 'Guest', bgCheck: 'N/A' });

  const filteredPeople = people.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = async () => {
    if (!newPerson.name) return;
    try {
      if (db) {
        await addDoc(collection(db, 'people'), newPerson);
      } else {
        // Fallback if db isn't connected
        setPeople([{ id: Date.now(), ...newPerson }, ...people]);
      }
      setIsAdding(false);
      setNewPerson({ name: '', email: '', phone: '', address: '', type: 'Guest', bgCheck: 'N/A' });
    } catch(e) { console.error(e); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
       <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">People & Check-ins</h1>
          <p className="text-stone-500 text-sm mt-1">Manage profiles, background checks, and secure kids check-in.</p>
        </div>
        <div className="flex gap-3">
          <button className={`px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-md text-sm font-medium shadow-sm hover:bg-stone-50 flex items-center gap-2`}><UserCheck size={16}/> Launch Check-in Station</button>
          {isAdmin && (
            <button onClick={() => setIsAdding(true)} className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}><UserPlus size={16}/> Add Person</button>
          )}
        </div>
      </div>
      
      {isAdding && isAdmin && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-stone-900 mb-4">Add New Profile</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Full Name" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.name} onChange={e => setNewPerson({...newPerson, name: e.target.value})} />
              <input type="email" placeholder="Email Address" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.email} onChange={e => setNewPerson({...newPerson, email: e.target.value})} />
              <input type="text" placeholder="Phone Number" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.phone} onChange={e => setNewPerson({...newPerson, phone: e.target.value})} />
              <select className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.type} onChange={e => setNewPerson({...newPerson, type: e.target.value})}>
                <option value="Guest">Guest</option><option value="Member">Member</option><option value="Volunteer">Volunteer</option><option value="Staff">Staff</option>
              </select>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-md font-medium text-sm">Cancel</button>
                <button onClick={handleAdd} className={`px-4 py-2 ${theme.bg} text-white rounded-md font-medium text-sm hover:opacity-90`}>Save Profile</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between"><div><p className="text-sm font-medium text-stone-500">Total Profiles</p><h3 className="text-2xl font-bold text-stone-900">{people.length}</h3></div><div className={`p-3 rounded-lg ${theme.light} ${theme.color}`}><Users size={20}/></div></div>
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between"><div><p className="text-sm font-medium text-stone-500">New Guests (30d)</p><h3 className="text-2xl font-bold text-stone-900">24</h3></div><div className="p-3 rounded-lg bg-sky-50 text-sky-600"><UserPlus size={20}/></div></div>
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between"><div><p className="text-sm font-medium text-stone-500">Scheduled This Week</p><h3 className="text-2xl font-bold text-stone-900">86</h3></div><div className="p-3 rounded-lg bg-orange-50 text-orange-600"><CalendarDays size={20}/></div></div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
          <h3 className="font-semibold text-stone-800">Directory & Screening</h3>
          <div className="flex items-center gap-4">
             <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 h-4 w-4" />
              <input type="text" placeholder="Search people..." className="pl-9 pr-4 py-1.5 border border-stone-200 rounded-md text-sm outline-none focus:border-sky-500" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
             </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-stone-100 text-stone-500 font-medium">
              <tr><th className="px-5 py-3">Name</th><th className="px-5 py-3">Contact</th><th className="px-5 py-3">Address</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Background Check</th><th className="px-5 py-3 text-right"></th></tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredPeople.map((person) => (
                <tr key={person.id} className="hover:bg-stone-50 group">
                  <td className="px-5 py-3 font-medium text-stone-900 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${theme.light} ${theme.color}`}>{person.name.charAt(0)}</div>{person.name}
                  </td>
                  <td className="px-5 py-3 text-stone-500"><div className="flex flex-col"><span className="truncate">{person.email}</span><span className="text-xs">{person.phone}</span></div></td>
                  <td className="px-5 py-3 text-stone-500 text-xs">{person.address}</td>
                  <td className="px-5 py-3"><span className="text-stone-600">{person.type}</span></td>
                  <td className="px-5 py-3">
                    {person.bgCheck === 'Clear' && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800"><ShieldCheck size={12} className="mr-1"/> Clear</span>}
                    {person.bgCheck === 'Pending' && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><Clock size={12} className="mr-1"/> Pending</span>}
                    {person.bgCheck === 'Expired' && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800"><AlertCircle size={12} className="mr-1"/> Expired</span>}
                    {person.bgCheck === 'N/A' && <span className="text-stone-300 text-xs">Not Required</span>}
                  </td>
                  <td className="px-5 py-3 text-right text-stone-400">
                    {isAdmin && <button onClick={() => { if(db) { deleteDoc(doc(db, 'people', person.id)); } else { setPeople(people.filter(p => p.id !== person.id)); } }} className="hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><AlertCircle size={18} className="ml-auto"/></button>}
                  </td>
                </tr>
              ))}
              {filteredPeople.length === 0 && (
                <tr><td colSpan="6" className="px-5 py-8 text-center text-stone-500">No matching people found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GivingApp({ theme, donations, setDonations }) {
  const [reportResult, setReportResult] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newDonation, setNewDonation] = useState({ name: '', amount: '', fund: 'General Tithe', type: 'Zelle', date: 'Today' });

  const handleAddDonation = () => {
    if (!newDonation.name || !newDonation.amount) return;
    setDonations([{ id: Date.now(), ...newDonation }, ...donations]);
    setIsAdding(false);
    setNewDonation({ name: '', amount: '', fund: 'General Tithe', type: 'Zelle', date: 'Today' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Financial Analytics & Giving</h1>
          <p className="text-stone-500 text-sm mt-1">Track donations, Zelle reconciliation, and generate insights.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsAdding(true)} className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}><DollarSign size={16}/> Record Gift / Zelle Sync</button>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-stone-900 mb-4">Record New Gift</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Donor Name" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-teal-500" value={newDonation.name} onChange={e => setNewDonation({...newDonation, name: e.target.value})} />
              <input type="text" placeholder="Amount (e.g. $100.00)" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-teal-500" value={newDonation.amount} onChange={e => setNewDonation({...newDonation, amount: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <select className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-teal-500" value={newDonation.fund} onChange={e => setNewDonation({...newDonation, fund: e.target.value})}>
                  <option value="General Tithe">General Tithe</option>
                  <option value="Missions">Missions</option>
                  <option value="Building Fund">Building Fund</option>
                </select>
                <select className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-teal-500" value={newDonation.type} onChange={e => setNewDonation({...newDonation, type: e.target.value})}>
                  <option value="Zelle">Zelle</option>
                  <option value="Cash/Check">Cash/Check</option>
                  <option value="Online Card">Online Card</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-md font-medium text-sm">Cancel</button>
                <button onClick={handleAddDonation} className={`px-4 py-2 ${theme.bg} text-white rounded-md font-medium text-sm hover:opacity-90`}>Save Record</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between"><div><p className="text-sm font-medium text-stone-500">YTD Giving</p><h3 className="text-2xl font-bold text-stone-900">$142,500</h3></div><div className={`p-3 rounded-lg ${theme.light} ${theme.color}`}><TrendingUp size={20}/></div></div>
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between"><div><p className="text-sm font-medium text-stone-500">Recurring Donors</p><h3 className="text-2xl font-bold text-stone-900">184</h3></div><div className="p-3 rounded-lg bg-teal-50 text-teal-600"><Users size={20}/></div></div>
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between"><div><p className="text-sm font-medium text-stone-500">Average Gift</p><h3 className="text-2xl font-bold text-stone-900">$185</h3></div><div className="p-3 rounded-lg bg-orange-50 text-orange-600"><CreditCard size={20}/></div></div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center"><h3 className="font-semibold text-stone-800">Recent Transactions</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-stone-100 text-stone-500 font-medium">
                <tr><th className="px-5 py-3">Donor</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Fund</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Date</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {donations.map((donation) => (
                  <tr key={donation.id} className="hover:bg-stone-50">
                    <td className="px-5 py-4 font-medium text-stone-900">{donation.name}</td>
                    <td className="px-5 py-4 font-semibold text-teal-600">{donation.amount}</td>
                    <td className="px-5 py-4 text-stone-500">{donation.fund}</td>
                    <td className="px-5 py-4"><span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${donation.type === 'Zelle' ? 'bg-purple-100 text-purple-700' : 'bg-stone-100 text-stone-600'}`}>{donation.type}</span></td>
                    <td className="px-5 py-4 text-stone-500">{donation.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden h-fit">
          <div className={`${theme.bg} p-4 text-white flex justify-between items-center`}><div className="flex items-center gap-2"><Sparkles size={18} className="text-white/80" /><h3 className="font-semibold">AI Data Analyst</h3></div><span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded uppercase tracking-wider">Gemini</span></div>
          <div className="p-4 flex flex-col gap-4">
            <p className="text-xs text-stone-500">Ask Gemini to analyze giving trends, forecast budgets, or reconcile your Zelle transaction logs.</p>
            <textarea className="w-full p-3 border border-stone-200 rounded-lg text-sm focus:ring-1 focus:ring-teal-500 outline-none resize-none bg-stone-50" placeholder="e.g., Match the uploaded Zelle CSV with our internal donor records..." rows="3"></textarea>
            <button onClick={() => setReportResult(true)} className={`w-full py-2.5 ${theme.bg} text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity flex justify-center items-center gap-2`}>Generate Report</button>
            {reportResult && (
               <div className="mt-2 p-4 bg-stone-50 border border-stone-100 rounded-lg text-xs text-stone-700 whitespace-pre-wrap leading-relaxed">
                 <strong className="text-teal-700">Reconciliation Complete:</strong><br/>Successfully matched 42 Zelle transactions to existing donor profiles. 3 records require manual review.
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarApp({ theme, events, setEvents, isAdmin }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: 'Feb 20, 2026', time: '', type: 'Meeting' });

  const handleAddEvent = async () => {
    if (!newEvent.title) return;
    try {
      if (db) {
        await addDoc(collection(db, 'events'), newEvent);
      } else {
        setEvents([...events, { id: Date.now(), ...newEvent }]);
      }
      setIsAdding(false);
      setNewEvent({ title: '', date: 'Feb 20, 2026', time: '', type: 'Meeting' });
    } catch(e) { console.error(e); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Master Calendar</h1>
          <p className="text-stone-500 text-sm mt-1">February 2026</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && <button onClick={() => setIsAdding(true)} className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}><Plus size={16}/> New Event</button>}
        </div>
      </div>

      {isAdding && isAdmin && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-stone-900 mb-4">Schedule Event</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Event Title" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-orange-500" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Date (e.g. Feb 20, 2026)" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-orange-500" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
                <input type="text" placeholder="Time (e.g. 6:30 PM)" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-orange-500" value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})} />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-md font-medium text-sm">Cancel</button>
                <button onClick={handleAddEvent} className={`px-4 py-2 ${theme.bg} text-white rounded-md font-medium text-sm hover:opacity-90`}>Save Event</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (<div key={day} className="py-3 text-center text-xs font-semibold text-stone-500 uppercase tracking-wider">{day}</div>))}
        </div>
        <div className="grid grid-cols-7 grid-rows-5 bg-stone-200 gap-px">
          {Array.from({ length: 35 }).map((_, i) => {
            const dayNum = i - 0; const isCurrentMonth = dayNum > 0 && dayNum <= 28; const isAshWed = dayNum === 18; const isFirstSunday = dayNum === 22;
            return (
              <div key={i} className={`min-h-[120px] p-2 ${isCurrentMonth ? 'bg-white hover:bg-stone-50' : 'bg-stone-50'} transition-colors`}>
                <span className={`text-sm font-medium ${isCurrentMonth ? 'text-stone-700' : 'text-stone-400'}`}>{isCurrentMonth ? dayNum : ''}</span>
                <div className="mt-1 space-y-1">
                  {isAshWed && <div className={`text-xs px-2 py-1 rounded bg-stone-100 border-l-2 ${theme.border} truncate font-medium text-stone-700`}>Ash Wed Service</div>}
                  {isFirstSunday && <div className="text-xs px-2 py-1 rounded bg-teal-50 border-l-2 border-teal-300 truncate font-medium text-teal-700">Sunday Service</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WorkflowsApp({ theme }) {
  const [activeSubTab, setActiveSubTab] = useState('automations'); 
  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Comms & Workflows</h1>
          <p className="text-stone-500 text-sm mt-1">Manage automations, 2-way texting, and keywords.</p>
        </div>
        {activeSubTab === 'automations' && (<button className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}><Plus size={16}/> New Workflow</button>)}
      </div>
      <div className="border-b border-stone-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button onClick={() => setActiveSubTab('automations')} className={`border-b-2 py-4 px-1 text-sm font-medium ${activeSubTab === 'automations' ? `${theme.border} ${theme.color}` : 'border-transparent text-stone-500 hover:text-stone-700'}`}>Automations</button>
          <button onClick={() => setActiveSubTab('inbox')} className={`border-b-2 py-4 px-1 text-sm font-medium flex items-center gap-2 ${activeSubTab === 'inbox' ? `${theme.border} ${theme.color}` : 'border-transparent text-stone-500 hover:text-stone-700'}`}>2-Way Inbox <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">3</span></button>
          <button onClick={() => setActiveSubTab('keywords')} className={`border-b-2 py-4 px-1 text-sm font-medium ${activeSubTab === 'keywords' ? `${theme.border} ${theme.color}` : 'border-transparent text-stone-500 hover:text-stone-700'}`}>Keywords</button>
        </nav>
      </div>
      {activeSubTab === 'automations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden h-fit">
            <div className="p-4 border-b border-stone-100 bg-stone-50/50"><h2 className="font-semibold text-stone-800">AI Outreach Generator</h2></div>
            <div className="p-5 space-y-4">
              <div><label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase">Audience</label><select className="w-full p-2 border border-stone-200 rounded text-sm bg-white outline-none focus:ring-1 focus:ring-violet-500"><option>First-Time Guests</option><option>Lapsed Volunteers</option></select></div>
              <div><div className="flex justify-between items-center mb-1.5"><label className="block text-xs font-semibold text-stone-500 uppercase">Prompt</label><Sparkles size={12} className={theme.color}/></div><textarea className="w-full p-2 border border-stone-200 rounded text-sm bg-white outline-none focus:ring-1 focus:ring-violet-500 resize-none h-24" placeholder="Draft a warm welcome text..."></textarea></div>
              <button className={`w-full py-2 bg-stone-900 text-white rounded text-sm font-medium hover:bg-stone-800 transition-colors`}>Generate Draft</button>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
               <div className="p-4 border-b border-stone-100 bg-stone-50/50"><h2 className="font-semibold text-stone-800">Active Automations</h2></div>
              <div className="divide-y divide-stone-100">
                <WorkflowCard title="Post-Service Guest Text" trigger="Added to 'New Guest' list" actions="Send SMS, Assign Task" icon={Smartphone} />
                <WorkflowCard title="Volunteer Reminder" trigger="3 Days Before Scheduled Date" actions="Send Email" icon={Mail} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SecurityApp({ theme, isSeniorPastor }) {
  const [is2FA, setIs2FA] = useState(true);
  const [isDLP, setIsDLP] = useState(true);
  const [isEndpoint, setIsEndpoint] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Workspace Security</h1>
          <p className="text-stone-500 text-sm mt-1">Manage authentication, data loss prevention (DLP), and roles.</p>
        </div>
        {isSeniorPastor && (
          <div className="flex gap-2">
            <button className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}>
              Save Security Settings
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="p-5 border-b border-stone-200 bg-stone-50 flex items-center gap-2">
              <ShieldCheck size={18} className="text-stone-600"/>
              <h3 className="font-semibold text-stone-800">Authentication & Access</h3>
            </div>
            <div className="divide-y divide-stone-100">
              <div className="p-5 flex justify-between items-center hover:bg-stone-50 transition-colors">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">Enforce 2-Step Verification (2FA)</h4>
                  <p className="text-xs text-stone-500 mt-1 max-w-md">Require all staff and team leaders to use a secondary authentication method when logging in.</p>
                </div>
                <div onClick={() => isSeniorPastor && setIs2FA(!is2FA)} className={isSeniorPastor ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}>
                  {is2FA ? <ToggleRight size={36} className="text-emerald-500"/> : <ToggleLeft size={36} className="text-stone-300"/>}
                </div>
              </div>
              <div className="p-5 flex justify-between items-center hover:bg-stone-50 transition-colors">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">Advanced Endpoint Management</h4>
                  <p className="text-xs text-stone-500 mt-1 max-w-md">Allow admins to remotely wipe church data from personal mobile devices.</p>
                </div>
                <div onClick={() => isSeniorPastor && setIsEndpoint(!isEndpoint)} className={isSeniorPastor ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}>
                  {isEndpoint ? <ToggleRight size={36} className="text-emerald-500"/> : <ToggleLeft size={36} className="text-stone-300"/>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden h-fit">
            <div className="p-5 border-b border-stone-200 bg-stone-50">
              <h3 className="font-semibold text-stone-800">Role-Based Access</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-stone-700">Senior Pastor</span>
                <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded">Super Admin</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-stone-700">Staff / Directors</span>
                <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded">Full Admin</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-stone-700">Volunteers</span>
                <span className="text-xs font-bold bg-stone-100 text-stone-700 px-2 py-1 rounded">View Only</span>
              </div>
              {isSeniorPastor && <button className="w-full mt-2 py-2 border border-stone-200 rounded text-xs font-semibold text-stone-600 hover:bg-stone-50">Manage Roles</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportingApp({ theme }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Insights & Reports</h1>
          <p className="text-stone-500 text-sm mt-1">Visualize church health, growth trends, and engagement metrics.</p>
        </div>
      </div>
      <div className="bg-white p-12 rounded-xl border border-stone-200 shadow-sm flex flex-col items-center justify-center text-center">
        <PieChart size={48} className="text-stone-300 mb-4" />
        <h2 className="text-xl font-bold text-stone-900">Executive Dashboard</h2>
        <p className="text-stone-500 mt-2 max-w-md">This view is restricted to Lead Pastors and Administrators. Here you will see giving trends, full congregation demographics, and year-over-year attendance comparisons.</p>
      </div>
    </div>
  );
}

// ==========================================
// REUSABLE COMPONENTS
// ==========================================

function HomeMetricCard({ title, value, label, color }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex flex-col">
      <span className="text-sm font-medium text-stone-500">{title}</span>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`text-3xl font-bold tracking-tight ${color}`}>{value}</span>
        <span className="text-xs font-medium text-stone-400 uppercase tracking-wide">{label}</span>
      </div>
    </div>
  );
}

function QuickActionButton({ icon: Icon, label, color, onClick }) {
  return (
    <button onClick={onClick} className={`p-4 rounded-lg border flex flex-col items-center justify-center gap-2 transition-colors ${color}`}>
      <Icon size={24} />
      <span className="text-xs font-bold">{label}</span>
    </button>
  );
}

function WorkflowCard({ title, trigger, actions, icon: Icon }) {
  return (
    <div className="p-5 flex items-start gap-4 hover:bg-stone-50 transition-colors cursor-pointer group">
      <div className="p-2.5 bg-stone-100 rounded-lg text-stone-500 group-hover:bg-violet-100 group-hover:text-violet-600 transition-colors">
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <h4 className="font-semibold text-stone-900">{title}</h4>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-700 uppercase tracking-wider">Active</span>
        </div>
        <div className="mt-1 text-sm text-stone-500 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
          <span><strong className="font-medium text-stone-700">When:</strong> {trigger}</span>
          <span className="hidden sm:inline text-stone-300">•</span>
          <span><strong className="font-medium text-stone-700">Then:</strong> {actions}</span>
        </div>
      </div>
    </div>
  );
}
