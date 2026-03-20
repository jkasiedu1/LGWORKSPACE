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
  BarChart3, Download, TrendingDown, Activity, LogOut, Youtube, Edit2, Save, X, UserCog,
  QrCode, Printer, CheckSquare
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';

// 👇 1. LIVE GEMINI AI INTEGRATION 👇
// IMPORTANT: If you are deploying this app to Vercel, you MUST paste a real Gemini API Key here.
// Get one for free at: https://aistudio.google.com/
const GEMINI_API_KEY = "AIzaSyBxmuVCtzggdSh1uIhqlTjXN79HD_NVauc"; 

const callGeminiAI = async (prompt, systemContext) => {
  const apiKey = GEMINI_API_KEY || ""; // Uses your key if provided, otherwise attempts platform default
  
  const retryFetch = async (url, options, retries = 5) => {
    let delay = 1000;
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
      } catch (e) {
        if (i === retries - 1) throw e;
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      }
    }
  };

  try {
    const data = await retryFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemContext }] }
        })
      }
    );
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate a response. Please try again.";
  } catch (error) {
    console.error("AI Error:", error);
    return "An error occurred while connecting to the AI services. Please check your Gemini API key in the code.";
  }
};

// 👇 2. YOUR FIREBASE KEYS 👇
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

// 👇 3. ROLE-BASED ACCESS CONTROL (RBAC) 👇
const SENIOR_PASTOR_EMAIL = 'bigjoe11221985@gmail.com';
const ADMIN_EMAILS = ['jkasiedu1@gmail.com'];

// --- ENTERPRISE MOCK DATA ---
const UPCOMING_EVENTS = [
  { id: 1, title: 'Ash Wednesday Gathering', date: '2026-02-18', time: '19:00', type: 'Worship' },
  { id: 2, title: 'Sunday Worship Experience', date: '2026-02-22', time: '10:00', type: 'Weekend Service' },
  { id: 3, title: 'Serve Team Rally', date: '2026-02-28', time: '09:00', type: 'Equipping' },
];

const PEOPLE_LIST = [
  { id: 1, firstName: 'Sarah', lastName: 'Jenkins', name: 'Sarah Jenkins', email: 'sarah.j@example.com', phone: '(555) 123-4567', address: '123 Meadow Ln, TX', type: 'First Time', gender: 'Female', bgCheck: 'N/A' },
  { id: 2, firstName: 'David', lastName: 'Martinez', name: 'David Martinez', email: 'martinez@example.com', phone: '(555) 987-6543', address: '456 Oak Dr, TX', type: 'Member', gender: 'Male', bgCheck: 'N/A' },
  { id: 3, firstName: 'Marcus', lastName: 'Johnson', name: 'Marcus Johnson', email: 'marcus.j@example.com', phone: '(555) 654-3210', address: '654 Maple Ave, TX', type: 'Volunteer', gender: 'Male', bgCheck: 'Expired' },
  { id: 4, firstName: 'Emily', lastName: 'Thorne', name: 'Emily Thorne', email: 'emily.t@example.com', phone: '(555) 321-0987', address: '321 Elm Ct, TX', type: 'Staff', gender: 'Female', bgCheck: 'Clear' },
  { id: 5, firstName: 'Liam', lastName: 'Martinez', name: 'Liam Martinez', email: '', phone: '', address: '456 Oak Dr, TX', type: 'Child', gender: 'Male', parents: 'David Martinez', parentPhone: '(555) 987-6543', allergies: 'Peanuts', securityCode: 'A4B2', checkInStatus: 'Checked In', room: 'Preschool' },
  { id: 6, firstName: 'Chloe', lastName: 'Jenkins', name: 'Chloe Jenkins', email: '', phone: '', address: '123 Meadow Ln, TX', type: 'Child', gender: 'Female', parents: 'Sarah Jenkins', parentPhone: '(555) 123-4567', allergies: 'None', securityCode: 'X9M1', checkInStatus: 'Signed Out', room: 'Elementary' },
];

const PLAN_ITEMS = [
  { id: 1, time: '7:00 PM', length: '5:00', title: 'Welcome & Vision', type: 'Element', person: 'Pastor Joshua' },
  { id: 2, time: '7:05 PM', length: '15:00', title: 'Worship Set (3 Songs)', type: 'Song', person: 'Worship Band' },
  { id: 3, time: '7:20 PM', length: '5:00', title: 'Guided Prayer Moment', type: 'Element', person: 'Elder Team' },
  { id: 4, time: '7:25 PM', length: '35:00', title: 'Message: Beauty from Ashes', type: 'Sermon', person: 'Pastor Joshua' },
];

const SONG_LIBRARY = [
  { id: 1, title: 'Build My Life', artist: 'Housefires', key: 'G', originalKey: 'G', bpm: 70, ccli: '7070345', lastPlayed: 'Feb 1', hasLyrics: true, hasChords: true, hasAudio: true, youtube: 'https://youtube.com/watch?v=QZW4_8_zCBE' },
  { id: 2, title: 'What A Beautiful Name', artist: 'Hillsong Worship', key: 'D', originalKey: 'D', bpm: 68, ccli: '7068424', lastPlayed: 'Jan 25', hasLyrics: true, hasChords: true, hasAudio: false, youtube: 'https://youtube.com/watch?v=nQWFzMvCfLE' },
];

const RECENT_DONATIONS = [
  { id: 1, name: 'Anonymous', amount: '$500.00', date: '2026-02-16', fund: 'General Tithe', type: 'Zelle' },
  { id: 2, name: 'David Chen', amount: '$150.00', date: '2026-02-15', fund: 'Missions', type: 'Online Recurring' },
];

const MINISTRY_TEAMS = [
  { id: 1, name: 'Men\'s Ministry', lead: 'Michael Carter', members: 42, access: 'Full Admin', status: 'unlocked', desc: 'Manage men\'s breakfasts, retreats, and mentorship groups.', roster: [{id: 3, name: 'David Chen'}] },
  { id: 2, name: 'Women\'s Ministry', lead: 'Sarah Jenkins', members: 56, access: 'View Only', status: 'restricted', desc: 'Coordinate Bible studies, women\'s events, and support groups.', roster: [{id: 1, name: 'Sarah Jenkins'}] },
  { id: 3, name: 'Lifegate Youth', lead: 'David Chen', members: 18, access: 'Full Admin', status: 'unlocked', desc: 'Youth group scheduling, parent communications, and camp planning.', roster: [] },
  { id: 4, name: 'Lifegate Kids', lead: 'Emily Thorne', members: 35, access: 'View Only', status: 'restricted', desc: 'Children\'s curriculum, check-in data, and background checks.', roster: [] },
  { id: 5, name: 'Lifegate Music', lead: 'Marcus Johnson', members: 24, access: 'Full Admin', status: 'unlocked', desc: 'Worship sets, band schedules, and rehearsal resources.', roster: [] },
  { id: 6, name: 'Lifegate Media', lead: 'James Wilson', members: 12, access: 'No Access', status: 'locked', desc: 'A/V scheduling, stage plots, and livestream management.', roster: [] },
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
  const [globalSearchInput, setGlobalSearchInput] = useState('');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  
  // LIVE & LOCAL STATE
  const [events, setEvents] = useState(UPCOMING_EVENTS);
  const [people, setPeople] = useState(PEOPLE_LIST);
  const [planItems, setPlanItems] = useState(PLAN_ITEMS);
  const [donations, setDonations] = useState(RECENT_DONATIONS);
  const [songs, setSongs] = useState(SONG_LIBRARY);
  const [teamsList, setTeamsList] = useState(MINISTRY_TEAMS);
  
  // GLOBAL TOAST NOTIFICATION
  const [toastMsg, setToastMsg] = useState(null);
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };
  
  // LIVE FIREBASE AUTH STATE
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

  // INACTIVITY AUTO-LOGOUT
  useEffect(() => {
    let timeoutId;
    const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 mins

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (auth && auth.currentUser) {
          signOut(auth);
        }
      }, INACTIVITY_LIMIT);
    };

    if (isAuthenticated) {
      resetTimer();
      const eventsListener = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
      eventsListener.forEach(event => window.addEventListener(event, resetTimer));
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        eventsListener.forEach(event => window.removeEventListener(event, resetTimer));
      };
    }
  }, [isAuthenticated]);

  // Sync with Firestore
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

  // Inject Fonts & Scrollbars
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
      body { background-color: #fafaf9 !important; color: #1c1917 !important; font-family: 'Inter', sans-serif !important; }
      ::selection { background-color: #99f6e4 !important; }
      .font-sans { font-family: 'Inter', sans-serif !important; }
      .font-serif { font-family: 'Playfair Display', serif !important; }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #e7e5e4; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: #d6d3d1; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const handleGlobalSearch = (e) => {
    e.preventDefault();
    setGlobalSearchQuery(globalSearchInput);
  };

  const theme = APPS[activeApp];

  if (!authCheckComplete) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50"><Loader2 className="animate-spin text-stone-400" size={32} /></div>;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const visibleApps = Object.values(APPS).filter(app => {
    if (!isAdmin && ['security', 'reporting', 'giving', 'workflows'].includes(app.id)) return false;
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 font-sans relative">
      {/* GLOBAL TOAST NOTIFICATION */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 fade-in">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span className="text-sm font-medium">{toastMsg}</span>
        </div>
      )}

      <header className="bg-white border-b border-stone-200 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <div className="relative">
              <button onClick={() => setIsAppSwitcherOpen(!isAppSwitcherOpen)} className={`flex items-center gap-2 font-semibold text-lg tracking-tight hover:opacity-80 transition-opacity ${theme.color}`}>
                <Grid size={20} className="text-stone-400" />
                <div className="flex flex-col items-start leading-none mt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-stone-900 font-serif font-bold text-lg leading-none">Lifegate AG</span>
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
            <form onSubmit={handleGlobalSearch} className="relative w-full group flex">
              <input 
                type="text" 
                placeholder={`Search across apps...`} 
                value={globalSearchInput}
                onChange={(e) => {
                  setGlobalSearchInput(e.target.value);
                  if (e.target.value === '') setGlobalSearchQuery('');
                }}
                className="w-full pl-4 pr-10 py-1.5 bg-stone-100 border border-transparent rounded-l-md text-sm focus:bg-white focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-all outline-none" 
              />
              <button type="submit" className="bg-stone-200 hover:bg-stone-300 text-stone-600 px-3 rounded-r-md transition-colors flex items-center justify-center">
                <Search size={16} />
              </button>
              {globalSearchInput && (
                <button type="button" onClick={() => { setGlobalSearchInput(''); setGlobalSearchQuery(''); }} className="absolute right-12 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                  <X size={14} />
                </button>
              )}
            </form>
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
        {activeApp === 'services' && <ServicesApp theme={theme} planItems={planItems} setPlanItems={setPlanItems} isAdmin={isAdmin} showToast={showToast} />}
        {activeApp === 'music' && <MusicApp theme={theme} isAdmin={isAdmin} songs={songs} setSongs={setSongs} globalSearch={globalSearchQuery} showToast={showToast} />}
        {activeApp === 'teams' && <TeamsApp theme={theme} teamsList={teamsList} setTeamsList={setTeamsList} people={people} setActiveApp={setActiveApp} isAdmin={isAdmin} showToast={showToast} globalSearch={globalSearchQuery} />}
        {activeApp === 'people' && <PeopleApp theme={theme} people={people} setPeople={setPeople} isAdmin={isAdmin} globalSearch={globalSearchQuery} showToast={showToast} />}
        {activeApp === 'giving' && isAdmin && <GivingApp theme={theme} donations={donations} setDonations={setDonations} showToast={showToast} />}
        {activeApp === 'calendar' && <CalendarApp theme={theme} events={events} setEvents={setEvents} isAdmin={isAdmin} showToast={showToast} />}
        {activeApp === 'workflows' && isAdmin && <WorkflowsApp theme={theme} showToast={showToast} />}
        {activeApp === 'security' && isAdmin && <SecurityApp theme={theme} isSeniorPastor={isSeniorPastor} showToast={showToast} />}
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
        setErrorMsg("Firebase Auth not connected. Check keys.");
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
              <input type="email" required className="relative block w-full rounded-lg border border-stone-300 px-3 py-2.5 text-stone-900 focus:z-10 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 sm:text-sm transition-colors" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wide">Password</label>
              <input type="password" required className="relative block w-full rounded-lg border border-stone-300 px-3 py-2.5 text-stone-900 focus:z-10 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 sm:text-sm transition-colors" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          {errorMsg && (
            <div className="bg-rose-50 text-rose-600 text-sm p-3 rounded-lg flex items-center gap-2 font-medium">
              <AlertCircle size={16} />{errorMsg}
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
  const formatEventDate = (dateStr, timeStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${formattedDate} • ${timeStr || ''}`;
    } catch { return dateStr; }
  };

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
                  <div className="flex items-center gap-2 mt-1 text-xs text-stone-500">
                    <span>{formatEventDate(event.date, event.time)}</span>
                  </div>
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

function ServicesApp({ theme, planItems, setPlanItems, isAdmin, showToast }) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ time: '', length: '', title: '', type: 'Element', person: '' });

  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerData, setHeaderData] = useState({ title: 'Ash Wednesday Gathering', date: '2026-02-18', time: '19:00', location: 'Main Auditorium' });

  const displayDate = headerData.date ? new Date(headerData.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const displayTime = headerData.time ? (() => {
    const [h, m] = headerData.time.split(':');
    let hours = parseInt(h);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${m} ${ampm}`;
  })() : '';

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true); 
    setResult(null);
    const context = `You are a pastoral assistant helping plan a church service. Give a brief, insightful, 3-point teaching outline or service element note based on this prompt: "${prompt}". Keep it short and highly actionable.`;
    const responseText = await callGeminiAI(prompt, context);
    setResult(responseText);
    setIsGenerating(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          {isEditingHeader ? (
            <div className="space-y-3 bg-white p-4 rounded-xl shadow-sm border border-stone-200 max-w-lg animate-in slide-in-from-top-2">
              <input type="text" className="w-full font-serif text-2xl font-bold text-stone-900 border-b border-stone-200 focus:border-amber-500 outline-none pb-1" value={headerData.title} onChange={e => setHeaderData({...headerData, title: e.target.value})} />
              <div className="grid grid-cols-3 gap-2">
                 <input type="date" className="w-full text-sm border border-stone-200 p-1.5 rounded outline-none text-stone-600" value={headerData.date} onChange={e => setHeaderData({...headerData, date: e.target.value})} />
                 <input type="time" className="w-full text-sm border border-stone-200 p-1.5 rounded outline-none text-stone-600" value={headerData.time} onChange={e => setHeaderData({...headerData, time: e.target.value})} />
                 <input type="text" className="w-full text-sm border border-stone-200 p-1.5 rounded outline-none text-stone-600" value={headerData.location} onChange={e => setHeaderData({...headerData, location: e.target.value})} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                 <button onClick={() => setIsEditingHeader(false)} className="px-3 py-1.5 text-xs font-semibold text-white bg-stone-900 rounded-md flex items-center gap-1 hover:bg-stone-800"><Save size={14}/> Save Details</button>
              </div>
            </div>
          ) : (
            <div className="group flex items-start gap-3">
              <div>
                <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">{headerData.title}</h1>
                <p className="text-stone-500 text-sm mt-1">{displayDate} • {displayTime} • {headerData.location}</p>
              </div>
              {isAdmin && (
                <button onClick={() => setIsEditingHeader(true)} className="mt-1 text-stone-300 hover:text-amber-600 transition-colors opacity-0 group-hover:opacity-100" title="Edit Service Details">
                  <Edit2 size={18} />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          <button className="px-4 py-2 bg-white border border-stone-200 rounded-md text-sm font-medium text-stone-700 hover:bg-stone-50 shadow-sm">Print</button>
          {isAdmin && <button onClick={() => showToast("Service Plan Saved Successfully!")} className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90`}>Save Plan</button>}
        </div>
      </div>

      <div className="border-b border-stone-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button className={`border-b-2 ${theme.border} ${theme.color} py-4 px-1 text-sm font-medium`}>Order</button>
          <button className="border-b-2 border-transparent text-stone-500 hover:text-stone-700 py-4 px-1 text-sm font-medium">Teams</button>
          <button className="border-b-2 border-transparent text-stone-500 hover:text-stone-700 py-4 px-1 text-sm font-medium">Times</button>
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
                  <input type="text" placeholder="Time" className="p-2 text-sm border border-stone-200 rounded outline-none focus:border-amber-500" value={newItem.time} onChange={e => setNewItem({...newItem, time: e.target.value})} />
                  <input type="text" placeholder="Length" className="p-2 text-sm border border-stone-200 rounded outline-none focus:border-amber-500" value={newItem.length} onChange={e => setNewItem({...newItem, length: e.target.value})} />
                  <input type="text" placeholder="Title" className="p-2 text-sm border border-stone-200 rounded outline-none focus:border-amber-500" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} />
                  <select className="p-2 text-sm border border-stone-200 rounded outline-none focus:border-amber-500" value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value})}>
                    <option value="Element">Element</option><option value="Song">Song</option><option value="Sermon">Sermon</option>
                  </select>
                  <input type="text" placeholder="Person" className="p-2 text-sm border border-stone-200 rounded outline-none focus:border-amber-500" value={newItem.person} onChange={e => setNewItem({...newItem, person: e.target.value})} />
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

function MusicApp({ theme, isAdmin, songs, setSongs, globalSearch, showToast }) {
  const [musicPrompt, setMusicPrompt] = useState('');
  const [isAnalyzingMusic, setIsAnalyzingMusic] = useState(false);
  const [musicAnalysisResult, setMusicAnalysisResult] = useState(null);
  const [analysisMode, setAnalysisMode] = useState('vocals'); 
  const [selectedSong, setSelectedSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [newSong, setNewSong] = useState({ title: '', artist: '', key: 'C', bpm: 70, ccli: '', hasLyrics: true, hasChords: true, hasAudio: true, youtube: '' });

  useEffect(() => { if (globalSearch !== undefined) setSearchQuery(globalSearch); }, [globalSearch]);

  const filteredSongs = songs.filter(song => 
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    song.ccli?.includes(searchQuery)
  );

  const handleMusicAnalysis = async () => {
    if (!musicPrompt) return;
    setIsAnalyzingMusic(true); 
    setMusicAnalysisResult(null);
    const context = `You are a professional church music director. The user is asking about the song or lyrics provided. Analyze it focusing on the '${analysisMode}' perspective. Be brief and highly practical. Provide chords, vocal ranges, or lyrical themes based on what is asked.`;
    const responseText = await callGeminiAI(musicPrompt, context);
    setMusicAnalysisResult(responseText);
    setIsAnalyzingMusic(false); 
  };

  const handleAddSong = () => {
    if (!newSong.title || !newSong.artist) return;
    setSongs([{ id: Date.now(), ...newSong, lastPlayed: 'Never' }, ...songs]);
    setIsUploading(false);
    showToast("Song added to library successfully!");
    setNewSong({ title: '', artist: '', key: 'C', bpm: 70, ccli: '', hasLyrics: true, hasChords: true, hasAudio: true, youtube: '' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Music Library</h1>
          <p className="text-stone-500 text-sm mt-1">Manage songs, analyze arrangements, and link YouTube assets.</p>
        </div>
        <div className="flex gap-2">
          <button className={`px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-md text-sm font-medium shadow-sm hover:bg-stone-50 flex items-center gap-2`}><MonitorPlay size={16}/> Music Stand Mode</button>
          {isAdmin && <button onClick={() => setIsUploading(true)} className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}><UploadCloud size={16}/> Upload Song</button>}
        </div>
      </div>

      {isUploading && isAdmin && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2"><UploadCloud className="text-rose-600"/> Add New Song</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Song Title" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-rose-500" value={newSong.title} onChange={e => setNewSong({...newSong, title: e.target.value})} />
              <input type="text" placeholder="Artist" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-rose-500" value={newSong.artist} onChange={e => setNewSong({...newSong, artist: e.target.value})} />
              <div className="grid grid-cols-3 gap-2">
                <input type="text" placeholder="Key (e.g. C)" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-rose-500" value={newSong.key} onChange={e => setNewSong({...newSong, key: e.target.value, originalKey: e.target.value})} />
                <input type="number" placeholder="BPM" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-rose-500" value={newSong.bpm} onChange={e => setNewSong({...newSong, bpm: e.target.value})} />
                <input type="text" placeholder="CCLI #" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-rose-500" value={newSong.ccli} onChange={e => setNewSong({...newSong, ccli: e.target.value})} />
              </div>
              <div className="relative">
                <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500 h-5 w-5" />
                <input type="text" placeholder="YouTube URL (Optional)" className="w-full pl-10 p-2 border border-stone-200 rounded-md outline-none focus:border-rose-500" value={newSong.youtube} onChange={e => setNewSong({...newSong, youtube: e.target.value})} />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setIsUploading(false)} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-md font-medium text-sm">Cancel</button>
                <button onClick={handleAddSong} className={`px-4 py-2 ${theme.bg} text-white rounded-md font-medium text-sm hover:opacity-90`}>Save to Library</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden h-fit">
            <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
              <h3 className="font-semibold text-stone-800">Song Catalog</h3>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="border-b border-stone-100 text-stone-500 font-medium sticky top-0 bg-white z-10">
                  <tr><th className="px-5 py-3">Song Title</th><th className="px-5 py-3">Key / BPM</th><th className="px-5 py-3">CCLI #</th><th className="px-5 py-3">Assets</th></tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredSongs.map((song) => (
                    <tr key={song.id} onClick={() => setSelectedSong(song)} className={`cursor-pointer transition-colors ${selectedSong?.id === song.id ? 'bg-rose-50' : 'hover:bg-stone-50'}`}>
                      <td className="px-5 py-4"><div className="font-medium text-stone-900">{song.title}</div><div className="text-xs text-stone-500 mt-0.5">{song.artist}</div></td>
                      <td className="px-5 py-4 text-stone-500"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-700 mr-2 border border-stone-200">{song.key}</span><span className="text-xs">{song.bpm} bpm</span></td>
                      <td className="px-5 py-4 text-stone-500 text-xs">{song.ccli}<br/><span className="text-[10px] text-stone-400">Played: {song.lastPlayed}</span></td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`p-1.5 rounded-md ${song.hasLyrics ? 'bg-stone-100 text-stone-700' : 'bg-white text-stone-300 border border-stone-100'}`} title="Lyrics"><FileText size={14}/></span>
                          <span className={`p-1.5 rounded-md ${song.hasChords ? 'bg-stone-100 text-stone-700' : 'bg-white text-stone-300 border border-stone-100'}`} title="Chords"><Music size={14}/></span>
                          {song.youtube ? (
                            <a href={song.youtube} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-md bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors" title="Watch on YouTube">
                              <Youtube size={14}/>
                            </a>
                          ) : (
                            <span className={`p-1.5 rounded-md ${song.hasAudio ? 'bg-stone-100 text-stone-700' : 'bg-white text-stone-300 border border-stone-100'}`} title="Audio"><FileAudio size={14}/></span>
                          )}
                        </div>
                      </td>
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
              
              {selectedSong.youtube ? (
                <div className="bg-stone-900 aspect-video w-full relative flex items-center justify-center border-b border-stone-100">
                   <a href={selectedSong.youtube} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 group cursor-pointer">
                     <div className="w-16 h-16 bg-rose-600 text-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg"><Youtube size={32}/></div>
                     <span className="text-white text-xs font-bold uppercase tracking-wider">Open YouTube Source</span>
                   </a>
                </div>
              ) : (
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
              )}

              <div className="p-5 border-b border-stone-100 bg-stone-50 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Arrangement Key</label>
                  <select className="w-full p-2 border border-stone-200 rounded-md text-sm font-semibold text-stone-700 bg-white outline-none focus:border-rose-500"><option>{selectedSong.key} (Default)</option><option>C</option><option>D</option><option>E</option><option>F</option></select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Original Key</label>
                  <div className="p-2 border border-stone-200 rounded-md text-sm font-medium text-stone-500 bg-stone-100">{selectedSong.originalKey || selectedSong.key}</div>
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
                <div className="p-4 bg-stone-50 border-b border-stone-200">
                  <div className="flex gap-2 bg-white p-1 rounded-lg border border-stone-200">
                    <button onClick={() => setAnalysisMode('vocals')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors flex justify-center items-center gap-1.5 ${analysisMode === 'vocals' ? 'bg-rose-100 text-rose-700' : 'text-stone-500 hover:bg-stone-50'}`}><Mic2 size={14}/> Vocals</button>
                    <button onClick={() => setAnalysisMode('chords')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors flex justify-center items-center gap-1.5 ${analysisMode === 'chords' ? 'bg-rose-100 text-rose-700' : 'text-stone-500 hover:bg-stone-50'}`}><ListMusic size={14}/> Chords</button>
                    <button onClick={() => setAnalysisMode('lyrics')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors flex justify-center items-center gap-1.5 ${analysisMode === 'lyrics' ? 'bg-rose-100 text-rose-700' : 'text-stone-500 hover:bg-stone-50'}`}><FileText size={14}/> Lyrics</button>
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-4 flex-1">
                  <textarea className="w-full p-3 border border-stone-200 rounded-lg text-sm focus:ring-1 focus:ring-rose-500 outline-none resize-none bg-stone-50" placeholder="Paste lyrics or type a song title..." rows="3" value={musicPrompt} onChange={(e) => setMusicPrompt(e.target.value)}></textarea>
                  <button onClick={handleMusicAnalysis} disabled={isAnalyzingMusic || !musicPrompt} className={`w-full py-2.5 ${theme.bg} text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity flex justify-center items-center gap-2 disabled:opacity-50`}>
                    {isAnalyzingMusic ? <Loader2 size={16} className="animate-spin" /> : 'Analyze Track'}
                  </button>
                  {musicAnalysisResult && (<div className="mt-2 p-4 bg-stone-50 border border-stone-100 rounded-lg text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{musicAnalysisResult}</div>)}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function PeopleApp({ theme, people, setPeople, isAdmin, globalSearch, showToast }) {
  const [activeTab, setActiveTab] = useState('directory'); // directory, visitors, kids, checkin
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newPerson, setNewPerson] = useState({ 
    firstName: '', lastName: '', email: '', phone: '', address: '', 
    type: 'Member', gender: 'Female', bgCheck: 'N/A',
    parents: '', parentPhone: '', allergies: ''
  });

  useEffect(() => { if (globalSearch !== undefined) setSearchQuery(globalSearch); }, [globalSearch]);

  const filteredPeople = people.filter(p => {
    const matchesSearch = (p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.email?.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;

    if (activeTab === 'directory') return ['Member', 'Staff', 'Volunteer'].includes(p.type);
    if (activeTab === 'visitors') return ['First Time', 'Returning', 'Guest'].includes(p.type);
    if (activeTab === 'kids' || activeTab === 'checkin') return p.type === 'Child';
    return true;
  });

  const handleAdd = async () => {
    if (!newPerson.firstName || !newPerson.lastName) return;
    
    // Auto-format full name
    const dataToSave = {
      ...newPerson,
      name: `${newPerson.firstName} ${newPerson.lastName}`,
      securityCode: newPerson.type === 'Child' ? Math.random().toString(36).substring(2, 6).toUpperCase() : '',
      checkInStatus: newPerson.type === 'Child' ? 'Signed Out' : ''
    };

    try {
      if (db) {
        await addDoc(collection(db, 'people'), dataToSave);
      } else {
        setPeople([{ id: Date.now(), ...dataToSave }, ...people]);
      }
      setIsAdding(false);
      showToast("Profile created successfully!");
      setNewPerson({ firstName: '', lastName: '', email: '', phone: '', address: '', type: 'Member', gender: 'Female', bgCheck: 'N/A', parents: '', parentPhone: '', allergies: '' });
    } catch(e) { console.error(e); }
  };

  const handleCheckInToggle = (childId, currentStatus) => {
    if (!isAdmin) return;
    const newStatus = currentStatus === 'Checked In' ? 'Signed Out' : 'Checked In';
    setPeople(people.map(p => p.id === childId ? { ...p, checkInStatus: newStatus } : p));
    showToast(newStatus === 'Checked In' ? "Child Checked In Successfully" : "Child Signed Out Successfully");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
       <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">People & Check-ins</h1>
          <p className="text-stone-500 text-sm mt-1">Manage profiles, backgrounds, and secure kids check-in.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setActiveTab('checkin')} className={`px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-md text-sm font-medium shadow-sm hover:bg-stone-50 flex items-center gap-2`}>
            <UserCheck size={16}/> Launch Check-in Station
          </button>
          {isAdmin && (
            <button onClick={() => setIsAdding(true)} className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}>
              <UserPlus size={16}/> Add Profile
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-stone-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button onClick={() => setActiveTab('directory')} className={`border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'directory' ? `${theme.border} ${theme.color}` : 'border-transparent text-stone-500 hover:text-stone-700'}`}>General Directory</button>
          <button onClick={() => setActiveTab('visitors')} className={`border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'visitors' ? `${theme.border} ${theme.color}` : 'border-transparent text-stone-500 hover:text-stone-700'}`}>Visitors</button>
          <button onClick={() => setActiveTab('kids')} className={`border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'kids' ? `${theme.border} ${theme.color}` : 'border-transparent text-stone-500 hover:text-stone-700'}`}>Lifegate Kids</button>
          <button onClick={() => setActiveTab('checkin')} className={`border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'checkin' ? `${theme.border} ${theme.color}` : 'border-transparent text-stone-500 hover:text-stone-700'}`}><QrCode size={14} className="inline mr-1"/> Kids Check-in</button>
        </nav>
      </div>
      
      {isAdding && isAdmin && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-stone-900">Add New Profile</h2>
              <button onClick={() => setIsAdding(false)} className="text-stone-400 hover:text-rose-500"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="First Name" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.firstName} onChange={e => setNewPerson({...newPerson, firstName: e.target.value})} />
                <input type="text" placeholder="Last Name" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.lastName} onChange={e => setNewPerson({...newPerson, lastName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.type} onChange={e => setNewPerson({...newPerson, type: e.target.value})}>
                  <optgroup label="Directory"><option value="Member">Member</option><option value="Volunteer">Volunteer</option><option value="Staff">Staff</option></optgroup>
                  <optgroup label="Visitors"><option value="First Time">First Time Guest</option><option value="Returning">Returning Guest</option></optgroup>
                  <optgroup label="Kids Ministry"><option value="Child">Child (Lifegate Kids)</option></optgroup>
                </select>
                <select className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.gender} onChange={e => setNewPerson({...newPerson, gender: e.target.value})}>
                  <option value="Female">Female</option><option value="Male">Male</option>
                </select>
              </div>

              {newPerson.type !== 'Child' && (
                <>
                  <input type="email" placeholder="Email Address" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.email} onChange={e => setNewPerson({...newPerson, email: e.target.value})} />
                  <input type="text" placeholder="Phone Number" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.phone} onChange={e => setNewPerson({...newPerson, phone: e.target.value})} />
                </>
              )}

              <input type="text" placeholder={newPerson.type === 'Child' ? "Home Address" : "Mailing Address"} className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.address} onChange={e => setNewPerson({...newPerson, address: e.target.value})} />
              
              {newPerson.type === 'Child' && (
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg space-y-3">
                  <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Parents & Guardians</h4>
                  <input type="text" placeholder="Parent(s) Full Name" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.parents} onChange={e => setNewPerson({...newPerson, parents: e.target.value})} />
                  <input type="text" placeholder="Parent Phone Number" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.parentPhone} onChange={e => setNewPerson({...newPerson, parentPhone: e.target.value})} />
                  <input type="text" placeholder="Allergies / Medical Notes" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.allergies} onChange={e => setNewPerson({...newPerson, allergies: e.target.value})} />
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-md font-medium text-sm">Cancel</button>
                <button onClick={handleAdd} className={`px-4 py-2 ${theme.bg} text-white rounded-md font-medium text-sm hover:opacity-90`}>Save Profile</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER ACTIVE TAB */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
          <h3 className="font-semibold text-stone-800">
            {activeTab === 'directory' && "General Church Directory"}
            {activeTab === 'visitors' && "Visitor Log"}
            {activeTab === 'kids' && "Lifegate Kids Roster"}
            {activeTab === 'checkin' && "Live Check-in Station"}
          </h3>
          <div className="flex items-center gap-4">
             <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 h-4 w-4" />
              <input type="text" placeholder="Search records..." className="pl-9 pr-4 py-1.5 border border-stone-200 rounded-md text-sm outline-none focus:border-sky-500" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
             </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          {/* TAB: DIRECTORY & VISITORS */}
          {(activeTab === 'directory' || activeTab === 'visitors') && (
            <table className="w-full text-sm text-left relative">
              <thead className="border-b border-stone-100 text-stone-500 font-medium sticky top-0 bg-white z-10">
                <tr>
                  <th className="px-5 py-3">First Name</th>
                  <th className="px-5 py-3">Last Name</th>
                  <th className="px-5 py-3">Address</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Gender</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredPeople.map((person) => (
                  <tr key={person.id} className="hover:bg-stone-50">
                    <td className="px-5 py-3 font-medium text-stone-900">{person.firstName || person.name.split(' ')[0]}</td>
                    <td className="px-5 py-3 font-medium text-stone-900">{person.lastName || person.name.split(' ')[1] || ''}</td>
                    <td className="px-5 py-3 text-stone-500 text-xs">{person.address}</td>
                    <td className="px-5 py-3 text-stone-500">{person.email}</td>
                    <td className="px-5 py-3 text-stone-500">{person.phone}</td>
                    <td className="px-5 py-3"><span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${activeTab === 'visitors' ? 'bg-orange-100 text-orange-700' : 'bg-stone-100 text-stone-700'}`}>{person.type}</span></td>
                    <td className="px-5 py-3 text-stone-500">{person.gender || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB: KIDS */}
          {activeTab === 'kids' && (
            <table className="w-full text-sm text-left relative">
              <thead className="border-b border-stone-100 text-stone-500 font-medium sticky top-0 bg-white z-10">
                <tr>
                  <th className="px-5 py-3">First Name</th>
                  <th className="px-5 py-3">Last Name</th>
                  <th className="px-5 py-3">Address</th>
                  <th className="px-5 py-3">Parents / Guardians</th>
                  <th className="px-5 py-3">Parent Phone</th>
                  <th className="px-5 py-3">Allergies</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredPeople.map((child) => (
                  <tr key={child.id} className="hover:bg-stone-50">
                    <td className="px-5 py-3 font-medium text-stone-900">{child.firstName}</td>
                    <td className="px-5 py-3 font-medium text-stone-900">{child.lastName}</td>
                    <td className="px-5 py-3 text-stone-500 text-xs">{child.address}</td>
                    <td className="px-5 py-3 text-stone-700 font-medium">{child.parents}</td>
                    <td className="px-5 py-3 text-stone-500">{child.parentPhone}</td>
                    <td className="px-5 py-3 text-rose-600 font-semibold text-xs">{child.allergies}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB: CHECK-IN */}
          {activeTab === 'checkin' && (
            <table className="w-full text-sm text-left relative">
              <thead className="border-b border-stone-100 text-stone-500 font-medium sticky top-0 bg-white z-10">
                <tr>
                  <th className="px-5 py-3">Child Name</th>
                  <th className="px-5 py-3">Room / Group</th>
                  <th className="px-5 py-3">Security Code</th>
                  <th className="px-5 py-3">Allergies</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredPeople.map((child) => {
                  const isCheckedIn = child.checkInStatus === 'Checked In';
                  return (
                    <tr key={child.id} className={`${isCheckedIn ? 'bg-emerald-50/30' : ''} hover:bg-stone-50 transition-colors`}>
                      <td className="px-5 py-4 font-bold text-stone-900">{child.firstName} {child.lastName}</td>
                      <td className="px-5 py-4 text-stone-600 font-medium">{child.room || 'Unassigned'}</td>
                      <td className="px-5 py-4 font-mono font-bold tracking-widest text-indigo-600">{child.securityCode}</td>
                      <td className="px-5 py-4 text-rose-500 text-xs font-bold uppercase tracking-wider">{child.allergies !== 'None' ? child.allergies : ''}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isCheckedIn ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-500'}`}>
                          {isCheckedIn ? <CheckCircle2 size={12} className="mr-1"/> : null}
                          {child.checkInStatus}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isCheckedIn && <button className="p-1.5 text-stone-400 hover:text-stone-700 bg-white border border-stone-200 rounded shadow-sm" title="Print Tag"><Printer size={14}/></button>}
                          {isAdmin && (
                            <button 
                              onClick={() => handleCheckInToggle(child.id, child.checkInStatus)}
                              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${isCheckedIn ? 'bg-stone-200 text-stone-700 hover:bg-stone-300' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                            >
                              {isCheckedIn ? 'Sign Out' : 'Check In'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {filteredPeople.length === 0 && (
            <div className="px-5 py-12 text-center text-stone-500">No records found matching your criteria.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function GivingApp({ theme, donations, setDonations, showToast }) {
  const [reportResult, setReportResult] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newDonation, setNewDonation] = useState({ name: '', amount: '', fund: 'General Tithe', type: 'Zelle', date: new Date().toISOString().split('T')[0] });

  const handleAddDonation = () => {
    if (!newDonation.name || !newDonation.amount) return;
    setDonations([{ id: Date.now(), ...newDonation }, ...donations]);
    setIsAdding(false);
    showToast("Donation Recorded Successfully");
    setNewDonation({ name: '', amount: '', fund: 'General Tithe', type: 'Zelle', date: new Date().toISOString().split('T')[0] });
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
            <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2"><DollarSign className="text-teal-600"/> Record New Gift</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Donor Name" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-teal-500" value={newDonation.name} onChange={e => setNewDonation({...newDonation, name: e.target.value})} />
              <input type="text" placeholder="Amount (e.g. $100.00)" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-teal-500" value={newDonation.amount} onChange={e => setNewDonation({...newDonation, amount: e.target.value})} />
              <input type="date" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-teal-500 text-sm text-stone-600" value={newDonation.date} onChange={e => setNewDonation({...newDonation, date: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <select className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-teal-500 text-sm" value={newDonation.fund} onChange={e => setNewDonation({...newDonation, fund: e.target.value})}>
                  <option value="General Tithe">General Tithe</option>
                  <option value="Missions">Missions</option>
                  <option value="Building Fund">Building Fund</option>
                </select>
                <select className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-teal-500 text-sm" value={newDonation.type} onChange={e => setNewDonation({...newDonation, type: e.target.value})}>
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
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-stone-100 text-stone-500 font-medium sticky top-0 bg-white z-10">
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

function CalendarApp({ theme, events, setEvents, isAdmin, showToast }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: new Date().toISOString().split('T')[0], time: '10:00', type: 'Meeting' });

  const today = new Date('2026-02-20T12:00:00'); 
  const currentMonth = today.getMonth(); 
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  
  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.date) return;
    try {
      if (db) {
        await addDoc(collection(db, 'events'), newEvent);
      } else {
        setEvents([...events, { id: Date.now(), ...newEvent }]);
      }
      setIsAdding(false);
      showToast("Event Scheduled");
      setNewEvent({ title: '', date: new Date().toISOString().split('T')[0], time: '10:00', type: 'Meeting' });
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
            <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2"><CalendarIcon className="text-orange-500"/> Schedule Event</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Event Title" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-orange-500" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input type="date" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-orange-500 text-sm text-stone-600" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
                <input type="time" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-orange-500 text-sm text-stone-600" value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})} />
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
            const dayNum = i - firstDayOfMonth + 1; 
            const isCurrentMonth = dayNum > 0 && dayNum <= daysInMonth; 
            
            const formattedDate = isCurrentMonth ? `2026-02-${dayNum.toString().padStart(2, '0')}` : null;
            const daysEvents = events.filter(e => e.date === formattedDate);

            return (
              <div key={i} className={`min-h-[120px] p-2 ${isCurrentMonth ? 'bg-white hover:bg-stone-50' : 'bg-stone-50 text-transparent'} transition-colors`}>
                <span className={`text-sm font-medium ${isCurrentMonth ? 'text-stone-700' : 'text-stone-300'}`}>{isCurrentMonth ? dayNum : ''}</span>
                <div className="mt-1 space-y-1">
                  {daysEvents.map(event => (
                     <div key={event.id} className={`text-[10px] px-2 py-1 rounded bg-orange-50 border-l-2 ${theme.border} truncate font-bold text-orange-700 shadow-sm`} title={`${event.time} - ${event.title}`}>
                       {event.time} - {event.title}
                     </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TeamsApp({ theme, teamsList, setTeamsList, people, setActiveApp, isAdmin, showToast, globalSearch }) {
  const [activePortal, setActivePortal] = useState(null);
  const [activeTab, setActiveTab] = useState('roster');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [memberToAdd, setMemberToAdd] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { if (globalSearch !== undefined) setSearchQuery(globalSearch); }, [globalSearch]);
  
  const filteredTeams = teamsList.filter(team => 
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    team.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddMember = () => {
    if (!memberToAdd) return;
    const person = people.find(p => p.id.toString() === memberToAdd);
    if (!person) return;
    
    const updatedTeams = teamsList.map(t => {
      if (t.id === activePortal.id) {
        return { ...t, members: t.members + 1, roster: [...(t.roster||[]), person] };
      }
      return t;
    });
    setTeamsList(updatedTeams);
    setActivePortal(updatedTeams.find(t => t.id === activePortal.id));
    setIsAddingMember(false);
    showToast(`${person.name} assigned to ${activePortal.name}`);
  };

  if (activePortal) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 text-left">
        <div className="flex justify-between items-end mb-6">
          <div>
            <button onClick={() => setActivePortal(null)} className="text-stone-400 hover:text-stone-600 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1 transition-colors"><ChevronRight className="rotate-180" size={14}/> Back to Portals</button>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${theme.light} ${theme.color}`}><FolderLock size={24}/></div>
              <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">{activePortal.name}</h1>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-stone-500 text-sm font-medium">Team Lead: {activePortal.lead}</span><span className="text-stone-300">•</span>
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isAdmin ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>Your Access: {isAdmin ? 'Full Admin' : 'View Only'}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}><MessageSquare size={16}/> Team Chat</button>
            {activePortal.name === 'Lifegate Music' && (
               <button onClick={() => setActiveApp('music')} className="px-4 py-2 bg-rose-600 text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2 ml-2">
                 <Music size={16}/> Open Music App
               </button>
            )}
          </div>
        </div>
        <div className="border-b border-stone-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button onClick={() => setActiveTab('roster')} className={`border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'roster' ? `${theme.border} ${theme.color}` : 'border-transparent text-stone-500 hover:text-stone-700'}`}>Team Roster</button>
            <button onClick={() => setActiveTab('files')} className={`border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'files' ? `${theme.border} ${theme.color}` : 'border-transparent text-stone-500 hover:text-stone-700'}`}>Secure Files & Resources</button>
          </nav>
        </div>
        {activeTab === 'files' && (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
              <h3 className="font-semibold text-stone-800">Restricted Team Documents</h3>
              {isAdmin && (<button className={`text-sm font-medium ${theme.color} flex items-center gap-1`}><UploadCloud size={14}/> Upload File</button>)}
            </div>
            <div className="divide-y divide-stone-100">
              <div className="p-4 flex items-center justify-between hover:bg-stone-50">
                <div className="flex items-center gap-3"><File className="text-stone-400" size={20}/><div><p className="font-medium text-stone-900 text-sm">Q1 Volunteer Handbook.pdf</p><p className="text-xs text-stone-500">Uploaded 2 days ago</p></div></div>
                {isAdmin && <button className="text-stone-400 hover:text-indigo-600"><MoreHorizontal size={18}/></button>}
              </div>
            </div>
            {!isAdmin && (
              <div className="p-4 bg-amber-50 border-t border-amber-100 flex items-start gap-3">
                <ShieldAlert className="text-amber-600 shrink-0" size={18}/><p className="text-xs text-amber-800 font-medium">You have 'View Only' access. Contact team lead to request edit permissions.</p>
              </div>
            )}
          </div>
        )}
        {activeTab === 'roster' && (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
              <h3 className="font-semibold text-stone-800">Active Members ({activePortal.members})</h3>
              {isAdmin && <button onClick={() => setIsAddingMember(!isAddingMember)} className={`text-sm font-medium ${theme.color} flex items-center gap-1`}><UserPlus size={14}/> Add Member</button>}
            </div>
            
            {isAddingMember && isAdmin && (
               <div className="p-4 border-b border-stone-200 bg-stone-100/50 flex gap-2 items-center">
                 <select className="flex-1 p-2 border border-stone-300 rounded text-sm outline-none focus:border-indigo-500" value={memberToAdd} onChange={e => setMemberToAdd(e.target.value)}>
                   <option value="">Select someone from database...</option>
                   {people.map(p => <option key={p.id} value={p.id}>{p.name} ({p.email})</option>)}
                 </select>
                 <button onClick={handleAddMember} className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-medium">Assign</button>
                 <button onClick={() => setIsAddingMember(false)} className="px-4 py-2 bg-stone-200 text-stone-700 rounded text-sm font-medium">Cancel</button>
               </div>
            )}

            <div className="divide-y divide-stone-100">
               {activePortal.roster && activePortal.roster.length > 0 ? activePortal.roster.map(member => (
                 <div key={member.id} className="p-4 flex items-center gap-3 hover:bg-stone-50">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">{member.name.charAt(0)}</div>
                    <span className="font-medium text-stone-900">{member.name}</span>
                 </div>
               )) : (
                 <div className="p-8 text-center"><Users className="mx-auto text-stone-300 mb-3" size={32}/><p className="text-sm text-stone-500">No members assigned to this roster yet.</p></div>
               )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Ministry Portals</h1>
          <p className="text-stone-500 text-sm mt-1">Secure, role-based workspaces restricted by department.</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}><Plus size={16}/> Create New Portal</button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map(team => (
          <div key={team.id} className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 flex flex-col relative overflow-hidden group">
            {!isAdmin && team.status === 'locked' && (
              <div className="absolute inset-0 bg-stone-100/60 backdrop-blur-[1px] z-10 flex items-center justify-center flex-col">
                <Lock size={32} className="text-stone-400 mb-2"/><span className="bg-white px-3 py-1 rounded shadow-sm text-xs font-bold text-stone-600 uppercase tracking-wider border border-stone-200">Access Denied</span>
              </div>
            )}
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-lg ${theme.light} ${theme.color}`}><FolderLock size={20}/></div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded ${isAdmin || team.status === 'unlocked' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{isAdmin ? 'Full Admin' : team.access}</span>
            </div>
            <h3 className="text-lg font-bold text-stone-900">{team.name}</h3>
            <p className="text-sm text-stone-500 mt-1 flex-1">{team.desc}</p>
            <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
              <div className="flex -space-x-2">
                {[...Array(Math.min(3, team.members))].map((_, i) => (<div key={i} className="w-6 h-6 rounded-full bg-stone-200 border-2 border-white"></div>))}
                {team.members > 3 && (<div className="w-6 h-6 rounded-full bg-stone-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-stone-500">+{team.members - 3}</div>)}
              </div>
              <button 
                onClick={() => { if (isAdmin || team.status !== 'locked') { setActivePortal(team); } }}
                className={`text-sm font-semibold flex items-center gap-1 transition-colors ${!isAdmin && team.status === 'locked' ? 'text-stone-300 cursor-not-allowed' : `${theme.color} hover:opacity-80`}`}
              >
                Enter Portal <ChevronRight size={16}/>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkflowsApp({ theme, showToast }) {
  const [activeSubTab, setActiveSubTab] = useState('automations'); 
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isNewWorkflow, setIsNewWorkflow] = useState(false);
  
  const handleGenerateDraft = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    const context = `You are a church communications director writing a short, warm, and highly engaging SMS or email based on the prompt. Keep it under 2 sentences if it's a text.`;
    const responseText = await callGeminiAI(prompt, context);
    setPrompt(responseText);
    setIsGenerating(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Comms & Workflows</h1>
          <p className="text-stone-500 text-sm mt-1">Manage automations, 2-way texting, and keywords.</p>
        </div>
        {activeSubTab === 'automations' && (<button onClick={() => setIsNewWorkflow(true)} className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}><Plus size={16}/> New Workflow</button>)}
      </div>

      {isNewWorkflow && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200">
              <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2"><Workflow className={theme.color}/> Build Automation</h2>
              <div className="space-y-4">
                <input type="text" placeholder="Workflow Name" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-violet-500" />
                <select className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-violet-500 text-sm text-stone-600"><option>Trigger: When someone joins a list</option><option>Trigger: Date based (e.g. Birthday)</option></select>
                <select className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-violet-500 text-sm text-stone-600"><option>Action: Send SMS</option><option>Action: Send Email</option><option>Action: Alert Staff</option></select>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setIsNewWorkflow(false)} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-md font-medium text-sm">Cancel</button>
                <button onClick={() => { setIsNewWorkflow(false); showToast("Workflow Created Successfully"); }} className={`px-4 py-2 ${theme.bg} text-white rounded-md font-medium text-sm hover:opacity-90`}>Save & Activate</button>
              </div>
           </div>
        </div>
      )}

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
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-stone-500 uppercase">Prompt</label>
                  <Sparkles size={12} className={theme.color}/>
                </div>
                <textarea 
                  className="w-full p-2 border border-stone-200 rounded text-sm bg-white outline-none focus:ring-1 focus:ring-violet-500 resize-none h-32" 
                  placeholder="e.g. Draft a warm welcome text for a first-time guest inviting them to coffee..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                ></textarea>
              </div>
              <button onClick={handleGenerateDraft} disabled={isGenerating || !prompt} className={`w-full py-2.5 bg-stone-900 text-white rounded text-sm font-medium hover:bg-stone-800 transition-colors flex justify-center items-center gap-2 disabled:opacity-50`}>
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : 'Generate Draft'}
              </button>
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
      {activeSubTab === 'inbox' && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden h-[500px] flex animate-in fade-in duration-300">
          <div className="w-1/3 border-r border-stone-200 flex flex-col bg-stone-50/50">
            <div className="p-4 border-b border-stone-200"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 h-4 w-4" /><input type="text" placeholder="Search conversations..." className="w-full pl-9 pr-4 py-1.5 border border-stone-300 rounded-md text-sm outline-none focus:border-violet-500"/></div></div>
            <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
              <div className="p-4 bg-white border-l-4 border-violet-500 cursor-pointer"><div className="flex justify-between items-start mb-1"><h4 className="font-bold text-stone-900 text-sm">Sarah Jenkins</h4><span className="text-xs text-stone-400">10:42 AM</span></div><p className="text-xs text-stone-600 truncate font-medium">Thank you! What time is youth group?</p></div>
            </div>
          </div>
          <div className="flex-1 flex flex-col bg-white">
            <div className="p-4 border-b border-stone-200 flex justify-between items-center"><h3 className="font-bold text-stone-900">Sarah Jenkins</h3><button className="text-stone-400 hover:text-stone-600"><MoreVertical size={18}/></button></div>
            <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto bg-stone-50/30">
              <div className="self-end bg-violet-600 text-white p-3 rounded-2xl rounded-tr-sm max-w-[75%] text-sm">Hi Sarah! Thanks for visiting Lifegate yesterday. We loved having you. Do you have any questions about the church?</div>
              <div className="self-start bg-stone-200 text-stone-800 p-3 rounded-2xl rounded-tl-sm max-w-[75%] text-sm">Thank you! What time is youth group?</div>
            </div>
            <div className="p-4 border-t border-stone-200 bg-white"><div className="flex gap-2"><input type="text" placeholder="Type an SMS reply..." className="flex-1 p-2 border border-stone-300 rounded-md text-sm outline-none focus:border-violet-500" /><button className="px-4 py-2 bg-violet-600 text-white rounded-md text-sm font-medium hover:bg-violet-700"><Send size={16}/></button></div></div>
          </div>
        </div>
      )}
    </div>
  );
}

function SecurityApp({ theme, isSeniorPastor, showToast }) {
  const [is2FA, setIs2FA] = useState(true);
  const [isDLP, setIsDLP] = useState(true);
  const [isPII, setIsPII] = useState(true);
  const [isOptOut, setIsOptOut] = useState(true);
  const [isEndpoint, setIsEndpoint] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Workspace Security</h1>
          <p className="text-stone-500 text-sm mt-1">Manage authentication, data loss prevention (DLP), and roles.</p>
        </div>
        {isSeniorPastor && (
          <div className="flex gap-2">
            <button onClick={() => showToast("Enterprise Security Settings Secured and Applied")} className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}>
              <ShieldCheck size={16}/> Save Security Settings
            </button>
          </div>
        )}
      </div>

      {showRoleModal && (
         <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-4 border-b border-stone-200 pb-3">
                <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2"><UserCog className="text-stone-700"/> Access Control Matrix</h2>
                <button onClick={() => setShowRoleModal(false)} className="text-stone-400 hover:text-rose-500"><X size={20}/></button>
              </div>
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                 <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                   <div><p className="font-bold text-indigo-900 text-sm">Lead Pastor (Owner)</p><p className="text-xs text-indigo-700">{SENIOR_PASTOR_EMAIL}</p></div>
                   <span className="text-xs font-bold uppercase tracking-wider bg-indigo-200 text-indigo-800 px-2 py-1 rounded">Super Admin</span>
                 </div>
                 <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                   <div><p className="font-bold text-emerald-900 text-sm">Campus Director</p><p className="text-xs text-emerald-700">{ADMIN_EMAILS[0]}</p></div>
                   <select className="text-xs font-bold uppercase tracking-wider bg-white border border-emerald-200 text-emerald-800 px-2 py-1 rounded outline-none cursor-pointer"><option>Full Admin</option><option>Revoke</option></select>
                 </div>
                 
                 <div className="pt-4 border-t border-stone-200 mt-4">
                   <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase">Promote User to Admin</label>
                   <div className="flex gap-2">
                     <input type="email" placeholder="staff@lifegate.ag" className="flex-1 p-2 text-sm border border-stone-300 rounded outline-none focus:border-stone-500" />
                     <button onClick={() => { showToast("Invitation sent"); setShowRoleModal(false); }} className="px-4 py-2 bg-stone-800 text-white rounded text-sm font-medium hover:bg-stone-900">Grant Access</button>
                   </div>
                 </div>
              </div>
           </div>
         </div>
      )}

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

          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="p-5 border-b border-stone-200 bg-stone-50 flex items-center gap-2">
              <ShieldAlert size={18} className="text-stone-600"/>
              <h3 className="font-semibold text-stone-800">Data Protection & AI Governance</h3>
            </div>
            <div className="divide-y divide-stone-100">
              <div className="p-5 flex justify-between items-center hover:bg-stone-50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-stone-900 text-sm">Data Loss Prevention (DLP)</h4>
                    <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 rounded uppercase">Recommended</span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1 max-w-md">Automatically scan internal chats and documents to prevent users from sharing sensitive congregant data externally.</p>
                </div>
                <div onClick={() => isSeniorPastor && setIsDLP(!isDLP)} className={isSeniorPastor ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}>
                  {isDLP ? <ToggleRight size={36} className="text-emerald-500"/> : <ToggleLeft size={36} className="text-stone-300"/>}
                </div>
              </div>
              <div className="p-5 flex justify-between items-center hover:bg-stone-50 transition-colors">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">PII Data Masking for AI</h4>
                  <p className="text-xs text-stone-500 mt-1 max-w-md">Automatically redact names, phone numbers, and addresses before sending any context to Gemini AI.</p>
                </div>
                <div onClick={() => isSeniorPastor && setIsPII(!isPII)} className={isSeniorPastor ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}>
                  {isPII ? <ToggleRight size={36} className="text-emerald-500"/> : <ToggleLeft size={36} className="text-stone-300"/>}
                </div>
              </div>
              <div className="p-5 flex justify-between items-center hover:bg-stone-50 transition-colors">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">LLM Training Opt-Out</h4>
                  <p className="text-xs text-stone-500 mt-1 max-w-md">Enforce Google Workspace privacy policy ensuring your internal data is never used to train public AI models.</p>
                </div>
                <div onClick={() => isSeniorPastor && setIsOptOut(!isOptOut)} className={isSeniorPastor ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}>
                  {isOptOut ? <ToggleRight size={36} className="text-emerald-500"/> : <ToggleLeft size={36} className="text-stone-300"/>}
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden h-fit">
            <div className="p-5 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={18} className="text-stone-600"/>
                <h3 className="font-semibold text-stone-800">Security Audit Log</h3>
              </div>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="divide-y divide-stone-100 max-h-[300px] overflow-y-auto">
              <div className="p-4 bg-rose-50/30">
                <p className="text-xs font-bold text-rose-700 flex items-center gap-1.5"><EyeOff size={12}/> DLP Policy Triggered</p>
                <p className="text-xs text-stone-600 mt-1">Blocked user 'S. Jenkins' from emailing a spreadsheet containing credit card numbers externally.</p>
                <p className="text-[10px] text-stone-400 mt-1">Today, 10:42 AM</p>
              </div>
              <div className="p-4">
                <p className="text-xs font-bold text-stone-700 flex items-center gap-1.5"><ShieldCheck size={12}/> Successful Login (2FA)</p>
                <p className="text-xs text-stone-600 mt-1">User 'J. Asiedu' authenticated successfully from recognized IP address.</p>
                <p className="text-[10px] text-stone-400 mt-1">Today, 8:15 AM</p>
              </div>
              <div className="p-4">
                <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5"><SmartphoneNfc size={12}/> New Device Registered</p>
                <p className="text-xs text-stone-600 mt-1">A new mobile device was registered to 'D. Chen' via Endpoint Management.</p>
                <p className="text-[10px] text-stone-400 mt-1">Yesterday, 4:30 PM</p>
              </div>
            </div>
            <div className="p-3 border-t border-stone-100 bg-stone-50 text-center">
              <button className="text-xs font-semibold text-stone-600 hover:text-stone-900">View Full Logs (Google Vault)</button>
            </div>
          </div>

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
              {isSeniorPastor && <button onClick={() => setShowRoleModal(true)} className="w-full mt-2 py-2 border border-stone-200 rounded text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-colors">Manage Roles</button>}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function ReportingApp({ theme }) {
  const attendanceData = [
    { label: 'Jan 18', value: 45 }, { label: 'Jan 25', value: 55 }, { label: 'Feb 1', value: 68 },
    { label: 'Feb 8', value: 62 }, { label: 'Feb 15', value: 85 }, { label: 'Feb 22', value: 95 },
  ];

  const demographics = [
    { label: '0-18 Years', percent: 25, color: 'bg-sky-500' }, { label: '19-35 Years', percent: 40, color: 'bg-fuchsia-500' },
    { label: '36-55 Years', percent: 20, color: 'bg-amber-500' }, { label: '55+ Years', percent: 15, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Insights & Reports</h1>
          <p className="text-stone-500 text-sm mt-1">Visualize church health, growth trends, and engagement metrics.</p>
        </div>
        <div className="flex gap-2">
          <button className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}>
            <Download size={16}/> Export Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-stone-500">Total Attendance</span>
            <div className={`p-1.5 rounded-md ${theme.light} ${theme.color}`}><Users size={16}/></div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold tracking-tight text-stone-900">842</span>
            <div className="flex items-center gap-1 mt-1 text-emerald-600 text-xs font-semibold">
              <TrendingUp size={14}/> +12% vs last month
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-stone-500">First-Time Guests</span>
            <div className="p-1.5 rounded-md bg-sky-50 text-sky-600"><UserPlus size={16}/></div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold tracking-tight text-stone-900">45</span>
            <div className="flex items-center gap-1 mt-1 text-emerald-600 text-xs font-semibold">
              <TrendingUp size={14}/> +4% vs last month
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-stone-500">Volunteer Rate</span>
            <div className="p-1.5 rounded-md bg-amber-50 text-amber-600"><Activity size={16}/></div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold tracking-tight text-stone-900">38%</span>
            <div className="flex items-center gap-1 mt-1 text-rose-600 text-xs font-semibold">
              <TrendingDown size={14}/> -2% vs last month
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-stone-500">Small Group Growth</span>
            <div className="p-1.5 rounded-md bg-teal-50 text-teal-600"><PieChart size={16}/></div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold tracking-tight text-stone-900">62%</span>
            <div className="flex items-center gap-1 mt-1 text-stone-400 text-xs font-semibold">
               Unchanged vs last month
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-stone-800 flex items-center gap-2"><BarChart3 size={18} className={theme.color}/> Attendance Growth (6 Wks)</h3>
            <span className="text-xs text-stone-500 font-medium">In-Person Only</span>
          </div>
          <div className="flex-1 flex items-end justify-between gap-2 h-48 relative">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none border-b border-stone-200 pb-6">
               <div className="border-b border-stone-100 border-dashed w-full h-0"></div>
               <div className="border-b border-stone-100 border-dashed w-full h-0"></div>
               <div className="border-b border-stone-100 border-dashed w-full h-0"></div>
               <div className="border-b border-stone-100 border-dashed w-full h-0"></div>
            </div>
            {attendanceData.map((data, index) => (
              <div key={index} className="flex flex-col items-center flex-1 z-10 group">
                <div className="w-full max-w-[40px] bg-fuchsia-100 hover:bg-fuchsia-200 rounded-t-md relative transition-all duration-300 flex items-end justify-center" style={{ height: `${data.value}%` }}>
                  <div className={`${theme.bg} w-full rounded-t-sm transition-all duration-500`} style={{ height: `${data.value - 20}%` }}></div>
                  <div className="absolute -top-8 bg-stone-800 text-white text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {Math.floor(data.value * 8.42)} 
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-stone-400 mt-2 uppercase tracking-wide">{data.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-stone-800 flex items-center gap-2"><PieChart size={18} className="text-teal-500"/> Fund Designation</h3>
            <span className="text-xs text-stone-500 font-medium">YTD 2026</span>
          </div>
          <div className="flex-1 flex items-center justify-center gap-8">
            <div className="relative flex items-center justify-center w-48 h-48 rounded-full" style={{ background: 'conic-gradient(#14b8a6 0% 55%, #0ea5e9 55% 75%, #f59e0b 75% 90%, #e11d48 90% 100%)' }}>
              <div className="w-32 h-32 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                <span className="text-xs text-stone-400 font-medium uppercase tracking-wider">Total</span>
                <span className="text-xl font-bold text-stone-900">$142k</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-teal-500"></div><span className="text-sm text-stone-600 font-medium">General Tithe (55%)</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-sky-500"></div><span className="text-sm text-stone-600 font-medium">Missions (20%)</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span className="text-sm text-stone-600 font-medium">Building (15%)</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500"></div><span className="text-sm text-stone-600 font-medium">Benevolence (10%)</span></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-stone-800 flex items-center gap-2"><Activity size={18} className="text-violet-500"/> Online vs. In-Person Engagement</h3>
          </div>
          <div className="flex-1 relative w-full h-48 bg-stone-50 rounded-lg overflow-hidden border border-stone-100">
             <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full p-2 overflow-visible">
               <line x1="0" y1="25" x2="100" y2="25" stroke="#f5f5f4" strokeWidth="1" />
               <line x1="0" y1="50" x2="100" y2="50" stroke="#f5f5f4" strokeWidth="1" />
               <line x1="0" y1="75" x2="100" y2="75" stroke="#f5f5f4" strokeWidth="1" />
               <polyline fill="none" stroke="#d946ef" strokeWidth="3" vectorEffect="non-scaling-stroke" points="0,80 20,70 40,40 60,45 80,20 100,10" />
               <polyline fill="none" stroke="#0ea5e9" strokeWidth="3" strokeDasharray="4" vectorEffect="non-scaling-stroke" points="0,60 20,65 40,70 60,60 80,75 100,65" />
             </svg>
             <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded shadow border border-stone-100 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-stone-600 uppercase"><div className="w-2 h-2 rounded-full bg-fuchsia-500"></div> In-Person</div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-stone-600 uppercase"><div className="w-2 h-2 rounded-full bg-sky-500"></div> Online</div>
             </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-stone-800 flex items-center gap-2"><Users size={18} className="text-sky-500"/> Congregation Demographics</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-5">
            {demographics.map((demo, idx) => (
              <div key={idx} className="w-full">
                <div className="flex justify-between text-xs font-semibold text-stone-600 mb-1">
                  <span>{demo.label}</span>
                  <span>{demo.percent}%</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-3">
                  <div className={`${demo.color} h-3 rounded-full transition-all duration-1000`} style={{ width: `${demo.percent}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

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
    <button type="button" onClick={onClick} className={`p-4 rounded-lg border flex flex-col items-center justify-center gap-2 transition-colors ${color} w-full`}>
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
