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
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

// --- MOCK DATA FOR STATIC TABS ---
const PLAN_ITEMS = [
  { id: 1, time: '7:00 PM', length: '5:00', title: 'Welcome & Vision', type: 'Element', person: 'Pastor Joshua' },
  { id: 2, time: '7:05 PM', length: '15:00', title: 'Worship Set (3 Songs)', type: 'Song', person: 'Worship Band' },
  { id: 3, time: '7:20 PM', length: '5:00', title: 'Guided Prayer Moment', type: 'Element', person: 'Elder Team' },
  { id: 4, time: '7:25 PM', length: '35:00', title: 'Message: Beauty from Ashes', type: 'Sermon', person: 'Pastor Joshua' },
];

const SONG_LIBRARY = [
  { id: 1, title: 'Build My Life', artist: 'Housefires', key: 'G', originalKey: 'G', bpm: 70, ccli: '7070345', lastPlayed: 'Feb 1', hasLyrics: true, hasChords: true, hasAudio: true },
  { id: 2, title: 'What A Beautiful Name', artist: 'Hillsong Worship', key: 'D', originalKey: 'D', bpm: 68, ccli: '7068424', lastPlayed: 'Jan 25', hasLyrics: true, hasChords: true, hasAudio: false },
];

const RECENT_DONATIONS = [
  { id: 1, name: 'Anonymous', amount: '$500.00', date: 'Feb 16, 2026', fund: 'General Tithe', type: 'Zelle' },
  { id: 2, name: 'David Chen', amount: '$150.00', date: 'Feb 15, 2026', fund: 'Missions', type: 'Online Recurring' },
];

const MINISTRY_TEAMS = [
  { id: 1, name: 'Men\'s Ministry', lead: 'Michael Carter', members: 42, access: 'Full Admin', status: 'unlocked', desc: 'Manage men\'s breakfasts, retreats, and mentorship groups.' },
  { id: 2, name: 'Women\'s Ministry', lead: 'Sarah Jenkins', members: 56, access: 'View Only', status: 'restricted', desc: 'Coordinate Bible studies, women\'s events, and support groups.' },
  { id: 3, name: 'Lifegate Music', lead: 'Marcus Johnson', members: 24, access: 'Full Admin', status: 'unlocked', desc: 'Worship sets, band schedules, and rehearsal resources.' },
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
  const [activeApp, setActiveApp] = useState('home');
  const [isAppSwitcherOpen, setIsAppSwitcherOpen] = useState(false);
  
  // LIVE FIREBASE STATE
  const [events, setEvents] = useState([]);
  const [people, setPeople] = useState([]);
  const [planItems, setPlanItems] = useState(PLAN_ITEMS);
  
  useEffect(() => {
    // Only fetch from Firebase if the user is logged in
    if (isAuthenticated) {
      const unsubEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
        setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      
      const unsubPeople = onSnapshot(collection(db, 'people'), (snapshot) => {
        setPeople(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      return () => {
        unsubEvents();
        unsubPeople();
      };
    }
  }, [isAuthenticated]);

  const theme = APPS[activeApp];

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <div className="relative">
              <button onClick={() => setIsAppSwitcherOpen(!isAppSwitcherOpen)} className={`flex items-center gap-2 font-semibold text-lg tracking-tight hover:opacity-80 transition-opacity ${theme.color}`}>
                <Grid size={20} className="text-stone-400" />
                <div className="flex flex-col items-start leading-none mt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-stone-900 font-serif font-bold text-lg leading-none">Lifegate AG</span>
                    <div className="hidden sm:flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200 ml-1">
                      <ShieldCheck size={10} className="text-emerald-500" />
                      <span className="text-[8px] text-emerald-700 font-bold uppercase tracking-wider">Secured</span>
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
                    {Object.values(APPS).map((app) => {
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
            <button className={`text-stone-400 hover:text-stone-600 transition-colors ${activeApp === 'security' ? 'text-stone-800' : ''}`} onClick={() => setActiveApp('security')}>
              <Settings className="h-5 w-5" />
            </button>
            <div className="h-8 w-8 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs font-bold shadow-sm cursor-pointer">
              JA
            </div>
            <button onClick={() => setIsAuthenticated(false)} className="text-stone-400 hover:text-rose-600 transition-colors ml-2" title="Logout">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {activeApp === 'home' && <HomeApp events={events} people={people} />}
        {activeApp === 'services' && <ServicesApp theme={APPS.services} planItems={planItems} setPlanItems={setPlanItems} />}
        {activeApp === 'music' && <MusicApp theme={APPS.music} />}
        {activeApp === 'teams' && <TeamsApp theme={APPS.teams} setActiveApp={setActiveApp} />}
        {activeApp === 'people' && <PeopleApp theme={APPS.people} people={people} />}
        {activeApp === 'giving' && <GivingApp theme={APPS.giving} />}
        {activeApp === 'calendar' && <CalendarApp theme={APPS.calendar} events={events} />}
        {activeApp === 'workflows' && <WorkflowsApp theme={APPS.workflows} />}
        {activeApp === 'security' && <SecurityApp theme={APPS.security} />}
        {activeApp === 'reporting' && <ReportingApp theme={APPS.reporting} />}
      </main>
    </div>
  );
}

// ==========================================
// APP MODULES (WITH LIVE FIREBASE LOGIC)
// ==========================================

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => { setIsLoading(false); onLogin(); }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-stone-200">
        <div className="text-center">
          <div className="flex justify-center items-center gap-2 mb-2"><Grid size={32} className="text-stone-800" /></div>
          <h2 className="mt-2 text-center text-3xl font-serif font-bold tracking-tight text-stone-900">Lifegate AG</h2>
          <p className="mt-2 text-center text-sm text-stone-500 font-medium">Workspace & Ministry Portal</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wide">Email Address</label>
              <input type="email" required className="relative block w-full rounded-lg border border-stone-300 px-3 py-2.5 text-stone-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 sm:text-sm transition-colors" placeholder="joshua@lifegate.ag" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wide">Password</label>
              <input type="password" required className="relative block w-full rounded-lg border border-stone-300 px-3 py-2.5 text-stone-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 sm:text-sm transition-colors" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
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

function PeopleApp({ theme, people }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newPerson, setNewPerson] = useState({ name: '', email: '', phone: '', address: '', type: 'Guest', bgCheck: 'N/A' });
  const [isSaving, setIsSaving] = useState(false);

  const handleAddPerson = async () => {
    if (!newPerson.name) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'people'), newPerson);
      setIsAdding(false);
      setNewPerson({ name: '', email: '', phone: '', address: '', type: 'Guest', bgCheck: 'N/A' });
    } catch (error) {
      console.error("Error adding person:", error);
    }
    setIsSaving(false);
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'people', id));
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
       <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">People & Check-ins</h1>
          <p className="text-stone-500 text-sm mt-1">Manage profiles, background checks, and secure kids check-in.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsAdding(true)} className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}>
            <UserPlus size={16}/> Add Person
          </button>
        </div>
      </div>
      
      {isAdding && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-stone-900 mb-4">Add New Profile</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Full Name" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.name} onChange={e => setNewPerson({...newPerson, name: e.target.value})} />
              <input type="email" placeholder="Email Address" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.email} onChange={e => setNewPerson({...newPerson, email: e.target.value})} />
              <input type="text" placeholder="Phone Number" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.phone} onChange={e => setNewPerson({...newPerson, phone: e.target.value})} />
              <select className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.type} onChange={e => setNewPerson({...newPerson, type: e.target.value})}>
                <option value="Guest">Guest</option>
                <option value="Member">Member</option>
                <option value="Volunteer">Volunteer</option>
                <option value="Staff">Staff</option>
              </select>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-md font-medium text-sm">Cancel</button>
                <button onClick={handleAddPerson} disabled={isSaving} className={`px-4 py-2 ${theme.bg} text-white rounded-md font-medium text-sm hover:opacity-90 flex items-center gap-2`}>
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Save Profile'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
          <h3 className="font-semibold text-stone-800">Directory</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-stone-100 text-stone-500 font-medium">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {people.length === 0 && (
                <tr><td colSpan="5" className="p-8 text-center text-stone-500">No people in the database yet. Click "Add Person" above.</td></tr>
              )}
              {people.map((person) => (
                <tr key={person.id} className="hover:bg-stone-50 group">
                  <td className="px-
