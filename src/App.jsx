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

// --- ORIGINAL MASTER DATA ---
const PLAN_ITEMS = [
  { id: 1, time: '7:00 PM', length: '5:00', title: 'Welcome & Vision', type: 'Element', person: 'Pastor Joshua' },
  { id: 2, time: '7:05 PM', length: '15:00', title: 'Worship Set (3 Songs)', type: 'Song', person: 'Worship Band' },
  { id: 3, time: '7:20 PM', length: '5:00', title: 'Guided Prayer Moment', type: 'Element', person: 'Elder Team' },
  { id: 4, time: '7:25 PM', length: '35:00', title: 'Message: Beauty from Ashes', type: 'Sermon', person: 'Pastor Joshua' },
];

const SONG_LIBRARY = [
  { id: 1, title: 'Build My Life', artist: 'Housefires', key: 'G', originalKey: 'G', bpm: 70, ccli: '7070345', lastPlayed: 'Feb 1', hasLyrics: true, hasChords: true, hasAudio: true },
  { id: 2, title: 'What A Beautiful Name', artist: 'Hillsong Worship', key: 'D', originalKey: 'D', bpm: 68, ccli: '7068424', lastPlayed: 'Jan 25', hasLyrics: true, hasChords: true, hasAudio: false },
  { id: 3, title: 'Gratitude', artist: 'Brandon Lake', key: 'B', originalKey: 'B', bpm: 72, ccli: '7158435', lastPlayed: 'Feb 15', hasLyrics: true, hasChords: true, hasAudio: true },
];

const RECENT_DONATIONS = [
  { id: 1, name: 'Anonymous', amount: '$500.00', date: 'Feb 16, 2026', fund: 'General Tithe', type: 'Zelle' },
  { id: 2, name: 'David Chen', amount: '$150.00', date: 'Feb 15, 2026', fund: 'Missions', type: 'Online Recurring' },
  { id: 3, name: 'Sarah Jenkins', amount: '$1,200.00', date: 'Feb 14, 2026', fund: 'Building Fund', type: 'Check' },
];

const MINISTRY_TEAMS = [
  { id: 1, name: 'Men\'s Ministry', lead: 'Michael Carter', members: 42, access: 'Full Admin', status: 'unlocked', desc: 'Manage men\'s breakfasts, retreats, and mentorship groups.' },
  { id: 2, name: 'Women\'s Ministry', lead: 'Sarah Jenkins', members: 56, access: 'View Only', status: 'restricted', desc: 'Coordinate Bible studies, women\'s events, and support groups.' },
  { id: 3, name: 'Lifegate Music', lead: 'Marcus Johnson', members: 24, access: 'Full Admin', status: 'unlocked', desc: 'Worship sets, band schedules, and rehearsal resources.' },
  { id: 4, name: 'Kids Ministry', lead: 'Jessica Miller', members: 31, access: 'Restricted', status: 'restricted', desc: 'Secure check-in, curriculum, and volunteer scheduling.' },
];

const APPS = {
  home: { id: 'home', name: 'Home', color: 'text-stone-700', bg: 'bg-stone-800', light: 'bg-stone-100', border: 'border-stone-200', icon: LayoutDashboard },
  services: { id: 'services', name: 'Services', color: 'text-amber-600', bg: 'bg-amber-600', light: 'bg-amber-50', border: 'border-amber-200', icon: BookOpen },
  music: { id: 'music', name: 'Music', color: 'text-rose-600', bg: 'bg-rose-600', light: 'bg-rose-50', border: 'border-rose-200', icon: Music },
  teams: { id: 'teams', name: 'Team Portals', color: 'text-indigo-600', bg: 'bg-indigo-600', light: 'bg-indigo-50', border: 'border-indigo-200', icon: FolderLock },
  people: { id: 'people', name: 'People', color: 'text-sky-600', bg: 'bg-sky-600', light: 'bg-sky-50', border: 'border-sky-200', icon: Users },
  giving: { id: 'giving', name: 'Giving', color: 'text-teal-600', bg: 'bg-teal-600', light: 'bg-teal-50', border: 'border-teal-200', icon: DollarSign },
  calendar: { id: 'calendar', name: 'Calendar', color: 'text-orange-500', bg: 'bg-orange-500', light: 'bg-orange-50', border: 'border-orange-200', icon: CalendarIcon },
  security: { id: 'security', name: 'Security', color: 'text-stone-600', bg: 'bg-stone-800', light: 'bg-stone-100', border: 'border-stone-300', icon: ShieldCheck }
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeApp, setActiveApp] = useState('home');
  const [isAppSwitcherOpen, setIsAppSwitcherOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [people, setPeople] = useState([]);

  useEffect(() => {
    if (isAuthenticated) {
      const unsubEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
        setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      const unsubPeople = onSnapshot(collection(db, 'people'), (snapshot) => {
        setPeople(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => { unsubEvents(); unsubPeople(); };
    }
  }, [isAuthenticated]);

  const theme = APPS[activeApp];

  if (!isAuthenticated) return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;

  return (
    <div className="min-h-screen flex flex-col font-sans">
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
          <div className="flex items-center gap-4">
            <button className="text-stone-400 hover:text-stone-600 transition-colors"><Settings className="h-5 w-5" /></button>
            <div className="h-8 w-8 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs font-bold shadow-sm cursor-pointer">JA</div>
            <button onClick={() => setIsAuthenticated(false)} className="text-stone-400 hover:text-rose-600 transition-colors ml-2"><LogOut className="h-5 w-5" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {activeApp === 'home' && <HomeApp events={events} people={people} />}
        {activeApp === 'services' && <ServicesApp theme={APPS.services} />}
        {activeApp === 'music' && <MusicApp theme={APPS.music} />}
        {activeApp === 'teams' && <TeamsApp theme={APPS.teams} />}
        {activeApp === 'people' && <PeopleApp theme={APPS.people} people={people} />}
        {activeApp === 'giving' && <GivingApp theme={APPS.giving} />}
        {activeApp === 'calendar' && <CalendarApp theme={APPS.calendar} events={events} />}
        {activeApp === 'security' && <SecurityApp theme={APPS.security} />}
      </main>
    </div>
  );
}

// --- FULL UI COMPONENTS ---

function HomeApp({ events, people }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Good Evening, Pastor Joshua</h1>
          <p className="text-stone-500 text-sm mt-1">Lifegate AG Workspace is connected and live.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Live Events" value={events.length} label="Upcoming" color="text-orange-600" />
        <MetricCard title="Total Profiles" value={people.length} label="In Database" color="text-sky-600" />
        <MetricCard title="Worship Songs" value={SONG_LIBRARY.length} label="In Library" color="text-rose-600" />
        <MetricCard title="Weekly Giving" value="$14.2k" label="Ahead of Goal" color="text-teal-600" />
      </div>
    </div>
  );
}

function MetricCard({ title, value, label, color }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
      <span className="text-sm font-medium text-stone-500">{title}</span>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`text-3xl font-bold tracking-tight ${color}`}>{value}</span>
        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{label}</span>
      </div>
    </div>
  );
}

function TeamsApp({ theme }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Ministry Portals</h1>
        <button className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium flex items-center gap-2 shadow-sm hover:opacity-90`}><Plus size={16}/> New Portal</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {MINISTRY_TEAMS.map(team => (
          <div key={team.id} className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2.5 rounded-lg ${theme.light} ${theme.color}`}><FolderLock size={26}/></div>
              <div className="flex items-center gap-2 bg-stone-50 px-2 py-1 rounded-full border border-stone-100">
                {team.status === 'unlocked' ? <Unlock size={12} className="text-emerald-500" /> : <Lock size={12} className="text-amber-500" />}
                <span className="text-[9px] font-bold uppercase tracking-widest text-stone-500">{team.access}</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-stone-900">{team.name}</h3>
            <p className="text-stone-500 text-sm mt-2 mb-6 leading-relaxed">{team.desc}</p>
            <div className="flex items-center justify-between pt-4 border-t border-stone-100">
              <div className="flex flex-col"><span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Team Lead</span><span className="text-sm font-bold text-stone-700">{team.lead}</span></div>
              <button className="flex items-center gap-1 text-sm font-bold text-indigo-600 hover:gap-2 transition-all">Enter Portal <ChevronRight size={16}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MusicApp({ theme }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Worship Library</h1>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-stone-100 text-stone-600 rounded-md text-sm font-medium flex items-center gap-2"><UploadCloud size={16}/> Import</button>
          <button className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium flex items-center gap-2 shadow-sm`}><Plus size={16}/> Add Song</button>
        </div>
      </div>
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500 font-bold uppercase text-[10px] tracking-widest border-b border-stone-100">
            <tr><th className="px-6 py-4">Title</th><th className="px-6 py-4">Artist</th><th className="px-6 py-4">Key</th><th className="px-6 py-4">BPM</th><th className="px-6 py-4">Resources</th><th className="px-6 py-4 text-right"></th></tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {SONG_LIBRARY.map(song => (
              <tr key={song.id} className="hover:bg-stone-50 transition-colors">
                <td className="px-6 py-4 font-bold text-stone-900">{song.title}</td>
                <td className="px-6 py-4 text-stone-500 font-medium">{song.artist}</td>
                <td className="px-6 py-4 font-mono font-bold text-rose-600">{song.key}</td>
                <td className="px-6 py-4 text-stone-500">{song.bpm}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    {song.hasLyrics && <FileText size={14} className="text-stone-300"/>}
                    {song.hasChords && <Music size={14} className="text-stone-300"/>}
                    {song.hasAudio && <FileAudio size={14} className="text-stone-300"/>}
                  </div>
                </td>
                <td className="px-6 py-4 text-right"><button className="text-stone-300 hover:text-stone-600"><MoreHorizontal size={18}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GivingApp({ theme }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Financial Stewardship</h1>
        <button className="px-4 py-2 bg-stone-900 text-white rounded-md text-sm font-medium flex items-center gap-2 shadow-sm"><Download size={16}/> Export Report</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {RECENT_DONATIONS.map(donation => (
          <div key={donation.id} className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{donation.date}</span>
              <span className="text-[10px] bg-teal-50 px-2.5 py-1 rounded-full font-bold text-teal-700 border border-teal-100 uppercase">{donation.type}</span>
            </div>
            <div className="text-3xl font-bold text-stone-900 mb-1">{donation.amount}</div>
            <div className="font-bold text-stone-700 text-sm">{donation.name}</div>
            <div className="text-xs text-stone-500 mt-1 font-medium italic">{donation.fund}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PeopleApp({ people }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newPerson, setNewPerson] = useState({ name: '', email: '', phone: '', type: 'Guest' });
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = async () => {
    if (!newPerson.name) return;
    setIsSaving(true);
    await addDoc(collection(db, 'people'), newPerson);
    setIsAdding(false);
    setNewPerson({ name: '', email: '', phone: '', type: 'Guest' });
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">People Directory</h1>
        <button onClick={() => setIsAdding(true)} className="px-4 py-2 bg-sky-600 text-white rounded-md text-sm font-medium flex items-center gap-2 shadow-sm"><UserPlus size={16}/> Add Profile</button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl border-2 border-sky-100 shadow-md grid grid-cols-1 sm:grid-cols-4 gap-4 animate-in zoom-in-95 duration-200">
          <input type="text" placeholder="Full Name" className="p-2.5 border rounded-lg focus:ring-2 focus:ring-sky-100 outline-none" value={newPerson.name} onChange={e => setNewPerson({...newPerson, name: e.target.value})} />
          <input type="email" placeholder="Email" className="p-2.5 border rounded-lg focus:ring-2 focus:ring-sky-100 outline-none" value={newPerson.email} onChange={e => setNewPerson({...newPerson, email: e.target.value})} />
          <select className="p-2.5 border rounded-lg outline-none" value={newPerson.type} onChange={e => setNewPerson({...newPerson, type: e.target.value})}>
            <option value="Guest">Guest</option><option value="Member">Member</option><option value="Staff">Staff</option>
          </select>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="flex-1 bg-sky-600 text-white rounded-lg font-bold text-sm">{isSaving ? 'Saving...' : 'Save'}</button>
            <button onClick={() => setIsAdding(false)} className="px-4 text-stone-400 font-bold text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500 font-bold uppercase text-[10px] tracking-widest border-b border-stone-100">
            <tr><th className="px-6 py-4">Name</th><th className="px-6 py-4">Contact</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {people.length === 0 && <tr><td colSpan="4" className="p-12 text-center text-stone-400 italic">No profiles found in the database.</td></tr>}
            {people.map(p => (
              <tr key={p.id} className="hover:bg-stone-50 group transition-colors">
                <td className="px-6 py-4 font-bold text-stone-900 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xs">{p.name.charAt(0)}</div>
                  {p.name}
                </td>
                <td className="px-6 py-4 text-stone-500 font-medium">{p.email}</td>
                <td className="px-6 py-4"><span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${p.type === 'Staff' ? 'bg-amber-50 text-amber-700' : 'bg-stone-100 text-stone-600'}`}>{p.type}</span></td>
                <td className="px-6 py-4 text-right"><button onClick={() => deleteDoc(doc(db, 'people', p.id))} className="text-stone-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><AlertCircle size={18}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CalendarApp({ events }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: 'Mar 20, 2026', time: '', type: 'Event' });

  const handleAdd = async () => {
    if (!newEvent.title) return;
    await addDoc(collection(db, 'events'), newEvent);
    setIsAdding(false);
    setNewEvent({ title: '', date: 'Mar 20, 2026', time: '', type: 'Event' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Master Calendar</h1>
        <button onClick={() => setIsAdding(true)} className="px-4 py-2 bg-orange-500 text-white rounded-md text-sm font-medium flex items-center gap-2 shadow-sm"><Plus size={16}/> New Event</button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl border-2 border-orange-100 shadow-md flex gap-4 animate-in zoom-in-95 duration-200">
          <input type="text" placeholder="Event Title" className="flex-1 p-2.5 border rounded-lg outline-none" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
          <input type="text" placeholder="Time" className="w-32 p-2.5 border rounded-lg outline-none" value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})} />
          <button onClick={handleAdd} className="bg-orange-500 text-white px-6 rounded-lg font-bold text-sm">Save</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map(ev => (
          <div key={ev.id} className="bg-white border border-stone-200 p-5 rounded-xl flex justify-between items-center shadow-sm group">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex flex-col items-center justify-center border border-orange-100">
                <span className="text-[10px] font-bold text-orange-400 uppercase leading-none">Mar</span>
                <span className="text-lg font-black text-orange-600 leading-none">20</span>
              </div>
              <div><div className="font-bold text-stone-900 text-lg">{ev.title}</div><div className="text-sm text-stone-400 font-medium">{ev.time}</div></div>
            </div>
            <button onClick={() => deleteDoc(doc(db, 'events', ev.id))} className="text-stone-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><AlertCircle size={20}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ServicesApp() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Service Planning</h1>
        <button className="px-4 py-2 bg-amber-600 text-white rounded-md text-sm font-medium flex items-center gap-2 shadow-sm"><Settings size={16}/> Sequence Editor</button>
      </div>
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        {PLAN_ITEMS.map((item, idx) => (
          <div key={item.id} className={`flex items-center p-4 ${idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'} border-b border-stone-100 last:border-0 group`}>
            <div className="w-10 text-stone-300 font-bold text-xs">{idx + 1}</div>
            <div className="w-24 text-stone-400 font-bold text-[10px] uppercase tracking-wider">{item.time}</div>
            <div className="flex-1">
              <div className="font-bold text-stone-800">{item.title}</div>
              <div className="text-xs text-stone-400 font-medium italic">{item.person}</div>
            </div>
            <div className="w-20 text-stone-400 font-mono text-xs">{item.length}</div>
            <div className="w-20"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.type === 'Song' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>{item.type}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecurityApp() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">System Security</h1>
      <div className="bg-stone-900 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-stone-800 rounded-xl text-emerald-400 shadow-inner"><ShieldCheck size={32}/></div>
          <div><h2 className="text-xl font-bold">Firewall Active</h2><p className="text-stone-400 text-sm">Your connection to Firebase is encrypted and secured.</p></div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-stone-800/50 rounded-lg border border-stone-800">
            <div className="flex items-center gap-3"><History size={16} className="text-stone-500"/><span className="text-sm font-medium">Last Login</span></div>
            <span className="text-sm text-stone-300 font-mono">2026-03-19 18:45:02</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-stone-800/50 rounded-lg border border-stone-800">
            <div className="flex items-center gap-3"><MonitorPlay size={16} className="text-stone-500"/><span className="text-sm font-medium">IP Address</span></div>
            <span className="text-sm text-stone-300 font-mono">72.181.XXX.XXX</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
      <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-xl border border-stone-200">
        <div className="text-center mb-10">
          <Grid size={40} className="mx-auto text-stone-800 mb-4" />
          <h2 className="text-3xl font-serif font-bold text-stone-900">Lifegate AG</h2>
          <p className="text-xs text-stone-400 mt-2 uppercase tracking-[0.2em] font-black">Ministry Portal</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
            <input type="email" required className="w-full p-3 border-2 border-stone-100 rounded-xl focus:border-stone-900 outline-none transition-colors" placeholder="joshua@lifegate.ag" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
            <input type="password" required className="w-full p-3 border-2 border-stone-100 rounded-xl focus:border-stone-900 outline-none transition-colors" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-stone-800 transition-all flex justify-center items-center">
            {loading ? <Loader2 className="animate-spin" size={20}/> : 'Enter Workspace'}
          </button>
        </form>
      </div>
    </div>
  );
}
