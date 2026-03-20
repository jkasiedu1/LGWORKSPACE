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
  const [activeApp, setActiveApp] = useState('home');
  const [isAppSwitcherOpen, setIsAppSwitcherOpen] = useState(false);
  
  // Centralized State Management (In-Memory)
  const [events, setEvents] = useState(UPCOMING_EVENTS);
  const [people, setPeople] = useState(PEOPLE_LIST);
  const [planItems, setPlanItems] = useState(PLAN_ITEMS);
  
  // Inject the HTML Head styles and fonts to ensure exact pixel-perfect match
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
      
      body {
        background-color: #fafaf9 !important; /* bg-stone-50 */
        color: #1c1917 !important; /* text-stone-900 */
        font-family: 'Inter', sans-serif !important;
      }
      
      ::selection {
        background-color: #99f6e4 !important; /* selection:bg-teal-200 */
      }
      
      .font-sans {
        font-family: 'Inter', sans-serif !important;
      }
      
      .font-serif {
        font-family: 'Playfair Display', serif !important;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const theme = APPS[activeApp];

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ENTERPRISE TOP NAVIGATION */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8">
          
          {/* Left: App Switcher & Branding */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <button 
                onClick={() => setIsAppSwitcherOpen(!isAppSwitcherOpen)}
                className={`flex items-center gap-2 font-semibold text-lg tracking-tight hover:opacity-80 transition-opacity ${theme.color}`}
              >
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

              {/* App Switcher Dropdown */}
              {isAppSwitcherOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsAppSwitcherOpen(false)}></div>
                  <div className="absolute top-full left-0 mt-3 w-72 bg-white rounded-xl shadow-xl border border-stone-200 p-3 grid grid-cols-3 gap-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {Object.values(APPS).map((app) => {
                      const Icon = app.icon;
                      return (
                        <button
                          key={app.id}
                          onClick={() => { setActiveApp(app.id); setIsAppSwitcherOpen(false); }}
                          className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg hover:bg-stone-50 transition-colors ${activeApp === app.id ? 'bg-stone-50 ring-1 ring-stone-200' : ''}`}
                        >
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

          {/* Center: Global Search */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 h-4 w-4 group-focus-within:text-teal-600 transition-colors" />
              <input 
                type="text" 
                placeholder="Search across all apps..." 
                className="w-full pl-9 pr-4 py-1.5 bg-stone-100 border border-transparent rounded-md text-sm focus:bg-white focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-all outline-none"
              />
            </div>
          </div>

          {/* Right: User Profile & Actions */}
          <div className="flex items-center gap-4">
            <button className="relative text-stone-400 hover:text-stone-600 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 h-2 w-2 bg-amber-500 border border-white rounded-full"></span>
            </button>
            <button className={`text-stone-400 hover:text-stone-600 transition-colors ${activeApp === 'security' ? 'text-stone-800' : ''}`} onClick={() => setActiveApp('security')}>
              <Settings className="h-5 w-5" />
            </button>
            <div className="h-8 w-8 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs font-bold shadow-sm cursor-pointer hover:ring-2 ring-stone-300 ring-offset-2 transition-all">
              JA
            </div>
            <button onClick={() => setIsAuthenticated(false)} className="text-stone-400 hover:text-rose-600 transition-colors ml-2" title="Logout">
              <LogOut className="h-5 w-5" />
            </button>
          </div>

        </div>
      </header>

      {/* DYNAMIC MODULE CONTENT */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {activeApp === 'home' && <HomeApp events={events} people={people} />}
        {activeApp === 'services' && <ServicesApp theme={APPS.services} planItems={planItems} setPlanItems={setPlanItems} />}
        {activeApp === 'music' && <MusicApp theme={APPS.music} />}
        {activeApp === 'teams' && <TeamsApp theme={APPS.teams} setActiveApp={setActiveApp} />}
        {activeApp === 'people' && <PeopleApp theme={APPS.people} people={people} setPeople={setPeople} />}
        {activeApp === 'giving' && <GivingApp theme={APPS.giving} />}
        {activeApp === 'calendar' && <CalendarApp theme={APPS.calendar} events={events} setEvents={setEvents} />}
        {activeApp === 'workflows' && <WorkflowsApp theme={APPS.workflows} />}
        {activeApp === 'security' && <SecurityApp theme={APPS.security} />}
        {activeApp === 'reporting' && <ReportingApp theme={APPS.reporting} />}
      </main>

    </div>
  );
}

// ==========================================
// APP MODULES
// ==========================================

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate a brief network authentication delay
    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-stone-200">
        <div className="text-center">
          <div className="flex justify-center items-center gap-2 mb-2">
            <Grid size={32} className="text-stone-800" />
          </div>
          <h2 className="mt-2 text-center text-3xl font-serif font-bold tracking-tight text-stone-900">
            Lifegate AG
          </h2>
          <p className="mt-2 text-center text-sm text-stone-500 font-medium">
            Workspace & Ministry Portal
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wide">Email Address</label>
              <input
                type="email"
                required
                className="relative block w-full rounded-lg border border-stone-300 px-3 py-2.5 text-stone-900 focus:z-10 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 sm:text-sm transition-colors"
                placeholder="joshua@lifegate.ag"
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

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-stone-300 text-teal-600 focus:ring-teal-600"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-stone-900">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-semibold text-teal-600 hover:text-teal-500">
                Forgot password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="group relative flex w-full justify-center rounded-lg bg-stone-900 px-3 py-3 text-sm font-semibold text-white hover:bg-stone-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 disabled:opacity-70 transition-all"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Sign in to Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReportingApp({ theme }) {
  const attendanceData = [
    { label: 'Jan 18', value: 45 },
    { label: 'Jan 25', value: 55 },
    { label: 'Feb 1', value: 68 },
    { label: 'Feb 8', value: 62 },
    { label: 'Feb 15', value: 85 },
    { label: 'Feb 22', value: 95 },
  ];

  const demographics = [
    { label: '0-18 Years', percent: 25, color: 'bg-sky-500' },
    { label: '19-35 Years', percent: 40, color: 'bg-fuchsia-500' },
    { label: '36-55 Years', percent: 20, color: 'bg-amber-500' },
    { label: '55+ Years', percent: 15, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
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

function TeamsApp({ theme, setActiveApp }) {
  const [activePortal, setActivePortal] = useState(null);
  const [activeTab, setActiveTab] = useState('roster');

  if (activePortal) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex justify-between items-end mb-6">
          <div>
            <button onClick={() => setActivePortal(null)} className="text-stone-400 hover:text-stone-600 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1 transition-colors">
              <ChevronRight className="rotate-180" size={14}/> Back to Portals
            </button>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${theme.light} ${theme.color}`}>
                <FolderLock size={24}/>
              </div>
              <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">{activePortal.name}</h1>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-stone-500 text-sm font-medium">Team Lead: {activePortal.lead}</span>
              <span className="text-stone-300">•</span>
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                activePortal.access === 'Full Admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                Your Access: {activePortal.access}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}>
              <MessageSquare size={16}/> Team Chat
            </button>
          </div>
        </div>

        <div className="border-b border-stone-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button onClick={() => setActiveTab('roster')} className={`border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'roster' ? `${theme.border} ${theme.color}` : 'border-transparent text-stone-500 hover:text-stone-700'}`}>Team Roster & Schedule</button>
            <button onClick={() => setActiveTab('files')} className={`border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'files' ? `${theme.border} ${theme.color}` : 'border-transparent text-stone-500 hover:text-stone-700'}`}>Secure Files & Resources</button>
            <button onClick={() => setActiveTab('settings')} className={`border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'settings' ? `${theme.border} ${theme.color}` : 'border-transparent text-stone-500 hover:text-stone-700'}`}>Portal Settings</button>
          </nav>
        </div>

        {activeTab === 'files' && (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
              <h3 className="font-semibold text-stone-800">Restricted Team Documents</h3>
              {activePortal.access === 'Full Admin' && (
                <button className={`text-sm font-medium ${theme.color} flex items-center gap-1`}><UploadCloud size={14}/> Upload File</button>
              )}
            </div>
            <div className="divide-y divide-stone-100">
              <div className="p-4 flex items-center justify-between hover:bg-stone-50">
                <div className="flex items-center gap-3">
                  <File className="text-stone-400" size={20}/>
                  <div>
                    <p className="font-medium text-stone-900 text-sm">Q1 Volunteer Handbook 2026.pdf</p>
                    <p className="text-xs text-stone-500">Uploaded 2 days ago by {activePortal.lead}</p>
                  </div>
                </div>
                <button className="text-stone-400 hover:text-indigo-600"><MoreHorizontal size={18}/></button>
              </div>
              <div className="p-4 flex items-center justify-between hover:bg-stone-50">
                <div className="flex items-center gap-3">
                  <File className="text-stone-400" size={20}/>
                  <div>
                    <p className="font-medium text-stone-900 text-sm">Emergency Protocols.docx</p>
                    <p className="text-xs text-stone-500">Uploaded last month</p>
                  </div>
                </div>
                <button className="text-stone-400 hover:text-indigo-600"><MoreHorizontal size={18}/></button>
              </div>
            </div>
            {activePortal.access !== 'Full Admin' && (
              <div className="p-4 bg-amber-50 border-t border-amber-100 flex items-start gap-3">
                <ShieldAlert className="text-amber-600 shrink-0" size={18}/>
                <p className="text-xs text-amber-800 font-medium">You have 'View Only' access to this portal. You cannot upload or delete files. Contact your team lead to request edit permissions.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'roster' && (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden p-8 text-center">
            <Users className="mx-auto text-stone-300 mb-3" size={32}/>
            <h3 className="font-medium text-stone-900">Roster View</h3>
            <p className="text-sm text-stone-500 mt-1">Displaying the schedules and commitments for {activePortal.members} active team members.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Ministry Portals</h1>
          <p className="text-stone-500 text-sm mt-1">Secure, role-based workspaces restricted by department.</p>
        </div>
        <div className="flex gap-2">
          <button className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}>
            <Plus size={16}/> Create New Portal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MINISTRY_TEAMS.map(team => (
          <div key={team.id} className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 flex flex-col relative overflow-hidden group">
            {team.status === 'locked' && (
              <div className="absolute inset-0 bg-stone-100/60 backdrop-blur-[1px] z-10 flex items-center justify-center flex-col">
                <Lock size={32} className="text-stone-400 mb-2"/>
                <span className="bg-white px-3 py-1 rounded shadow-sm text-xs font-bold text-stone-600 uppercase tracking-wider border border-stone-200">Access Denied</span>
              </div>
            )}
            
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-lg ${theme.light} ${theme.color}`}>
                <FolderLock size={20}/>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded ${
                team.status === 'unlocked' ? 'bg-emerald-100 text-emerald-700' :
                team.status === 'restricted' ? 'bg-amber-100 text-amber-700' :
                'bg-rose-100 text-rose-700'
              }`}>
                {team.access}
              </span>
            </div>
            
            <h3 className="text-lg font-bold text-stone-900">{team.name}</h3>
            <p className="text-sm text-stone-500 mt-1 flex-1">{team.desc}</p>
            
            <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
              <div className="flex -space-x-2">
                {[...Array(Math.min(3, team.members))].map((_, i) => (
                  <div key={i} className="w-6 h-6 rounded-full bg-stone-200 border-2 border-white"></div>
                ))}
                {team.members > 3 && (
                  <div className="w-6 h-6 rounded-full bg-stone-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-stone-500">
                    +{team.members - 3}
                  </div>
                )}
              </div>
              <button 
                onClick={() => {
                  if (team.status !== 'locked') {
                    if (team.name === 'Lifegate Music') {
                      setActiveApp('music');
                    } else {
                      setActivePortal(team);
                    }
                  }
                }}
                className={`text-sm font-semibold flex items-center gap-1 transition-colors ${team.status === 'locked' ? 'text-stone-300 cursor-not-allowed' : `${theme.color} hover:opacity-80`}`}
              >
                {team.name === 'Lifegate Music' && team.status !== 'locked' ? 'Open Music App' : 'Enter Portal'} <ChevronRight size={16}/>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HomeApp({ events, people }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Good Morning, Joshua</h1>
          <p className="text-stone-500 text-sm mt-1">Here is your ministry pulse for the week of Feb 16, 2026.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <HomeMetricCard title="Upcoming Services" value={events.length} label="Scheduled" color="text-amber-600" />
        <HomeMetricCard title="Total Profiles" value={people.length} label="In Database" color="text-sky-600" />
        <HomeMetricCard title="Serve Team" value="82%" label="Filled for Sunday" color="text-orange-600" />
        <HomeMetricCard title="Weekly Giving" value="$14.2k" label="Ahead of Goal" color="text-teal-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
            <h2 className="font-semibold text-stone-800">Your Schedule</h2>
            <button className="text-sm text-stone-500 hover:text-stone-800 font-medium">View Calendar</button>
          </div>
          <div className="divide-y divide-stone-100 flex-1">
            {events.slice(0, 4).map(event => (
              <div key={event.id} className="p-4 hover:bg-stone-50 transition-colors flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-stone-900 text-sm">{event.title}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-stone-500">
                    <span>{event.date}</span>
                    <span>•</span>
                    <span>{event.time}</span>
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
            <QuickActionButton icon={BookOpen} label="Plan a Service" color="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200" />
            <QuickActionButton icon={UserPlus} label="Add a Person" color="bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200" />
            <QuickActionButton icon={DollarSign} label="Zelle Sync" color="bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200" />
            <QuickActionButton icon={Send} label="Send Message" color="bg-violet-50 text-violet-700 hover:bg-violet-100 border-violet-200" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ServicesApp({ theme, planItems, setPlanItems }) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ time: '', length: '', title: '', type: 'Element', person: '' });

  const handleGenerate = () => {
    if (!prompt) return;
    setIsGenerating(true);
    setResult(null);
    setTimeout(() => {
      setIsGenerating(false);
      setResult(`**Teaching Guide: Beauty from Ashes**\n\n**1. The Call to Return (Joel 2)** \n- Unpack the historical context of rending hearts, not garments.\n- Key Takeaway: True life change is internal, not performative.\n\n**2. The Hidden Devotion (Matthew 6)**\n- Contrast cultural performative fasting with secret devotion.\n- Key Takeaway: Are we seeking the applause of culture or the reward of the Father?\n\n**3. The Imposition of Ashes**\n- Acknowledging our humanity ("Dust you are...").\n- The Gospel tension: the cross of ashes is a sign of mortality and resurrection.`);
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Ash Wednesday Gathering</h1>
          <p className="text-stone-500 text-sm mt-1">Feb 18, 2026 • 7:00 PM • Main Auditorium</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-stone-200 rounded-md text-sm font-medium text-stone-700 hover:bg-stone-50 shadow-sm">Print</button>
          <button className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90`}>Save Plan</button>
        </div>
      </div>

      <div className="border-b border-stone-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <a href="#" className={`border-b-2 ${theme.border} ${theme.color} py-4 px-1 text-sm font-medium`}>Order</a>
          <a href="#" className="border-b-2 border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300 py-4 px-1 text-sm font-medium">Teams</a>
          <a href="#" className="border-b-2 border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300 py-4 px-1 text-sm font-medium">Times</a>
        </nav>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-medium">
                <tr>
                  <th className="px-4 py-3 w-8"></th>
                  <th className="px-4 py-3 w-24">Time</th>
                  <th className="px-4 py-3 w-20">Length</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3 w-32">Person</th>
                  <th className="px-4 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {planItems.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50 group">
                    <td className="px-4 py-3 cursor-move text-stone-300 group-hover:text-stone-500"><GripVertical size={16} /></td>
                    <td className="px-4 py-3 font-medium text-stone-900">{item.time}</td>
                    <td className="px-4 py-3 text-stone-500">{item.length}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {item.type === 'Song' && <span className={`w-2 h-2 rounded-full ${theme.bg}`}></span>}
                        <span className="font-medium text-stone-900">{item.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-500">{item.person}</td>
                    <td className="px-4 py-3 text-right">
                       <button onClick={() => setPlanItems(planItems.filter(i => i.id !== item.id))} className="text-stone-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><AlertCircle size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {isAdding ? (
            <div className="p-4 border-t border-stone-100 bg-stone-50">
              <div className="grid grid-cols-5 gap-2 mb-3">
                <input type="text" placeholder="Time (e.g. 7:00 PM)" className="p-2 text-sm border border-stone-200 rounded outline-none" value={newItem.time} onChange={e => setNewItem({...newItem, time: e.target.value})} />
                <input type="text" placeholder="Length (e.g. 5:00)" className="p-2 text-sm border border-stone-200 rounded outline-none" value={newItem.length} onChange={e => setNewItem({...newItem, length: e.target.value})} />
                <input type="text" placeholder="Title" className="p-2 text-sm border border-stone-200 rounded outline-none" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} />
                <select className="p-2 text-sm border border-stone-200 rounded outline-none" value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value})}>
                  <option value="Element">Element</option>
                  <option value="Song">Song</option>
                  <option value="Sermon">Sermon</option>
                </select>
                <input type="text" placeholder="Person" className="p-2 text-sm border border-stone-200 rounded outline-none" value={newItem.person} onChange={e => setNewItem({...newItem, person: e.target.value})} />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-200 rounded">Cancel</button>
                <button onClick={() => {
                  if(newItem.title) {
                    setPlanItems([...planItems, { id: Date.now(), ...newItem }]);
                    setIsAdding(false);
                    setNewItem({ time: '', length: '', title: '', type: 'Element', person: '' });
                  }
                }} className={`px-3 py-1.5 text-sm text-white ${theme.bg} rounded hover:opacity-90`}>Save Item</button>
              </div>
            </div>
          ) : (
            <div className="p-4 border-t border-stone-100 bg-stone-50">
              <button onClick={() => setIsAdding(true)} className="text-sm font-medium text-stone-600 hover:text-stone-900 flex items-center gap-1"><Plus size={16}/> Add Item</button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden flex flex-col h-fit">
          <div className={`${theme.bg} p-4 text-white flex justify-between items-center`}>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-white/80" />
              <h3 className="font-semibold">AI Assistant</h3>
            </div>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded uppercase tracking-wider">Gemini</span>
          </div>
          <div className="p-4 flex flex-col gap-4">
            <textarea 
              className="w-full p-3 border border-stone-200 rounded-lg text-sm focus:ring-1 focus:ring-amber-500 outline-none resize-none bg-stone-50"
              placeholder="Topic, text, or theme..."
              rows="3"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            ></textarea>
            <button 
              onClick={handleGenerate}
              disabled={isGenerating || !prompt}
              className={`w-full py-2.5 ${theme.bg} text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity flex justify-center items-center gap-2 disabled:opacity-50`}
            >
              {isGenerating ? <Loader2 size={16} className="animate-spin" /> : 'Generate Guide'}
            </button>
            
            {result && (
              <div className="mt-2 p-4 bg-stone-50 border border-stone-100 rounded-lg text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
                {result}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function MusicApp({ theme }) {
  const [musicPrompt, setMusicPrompt] = useState('');
  const [isAnalyzingMusic, setIsAnalyzingMusic] = useState(false);
  const [musicAnalysisResult, setMusicAnalysisResult] = useState(null);
  const [analysisMode, setAnalysisMode] = useState('vocals'); 
  const [selectedSong, setSelectedSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleMusicAnalysis = () => {
    if (!musicPrompt) return;
    setIsAnalyzingMusic(true);
    setMusicAnalysisResult(null);
    
    setTimeout(() => {
      setIsAnalyzingMusic(false);
      setMusicAnalysisResult(`**Analysis Complete**\n\nGemini has successfully broken down the requested track parameters. Your arrangement notes are ready to view.`);
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Music Library</h1>
          <p className="text-stone-500 text-sm mt-1">Manage songs, analyze arrangements, and upload assets.</p>
        </div>
        <div className="flex gap-2">
          <button className={`px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-md text-sm font-medium shadow-sm hover:bg-stone-50 flex items-center gap-2`}>
            <MonitorPlay size={16}/> Music Stand Mode
          </button>
          <button className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}>
            <UploadCloud size={16}/> Upload Song
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between">
              <div><p className="text-xs font-semibold text-stone-500 uppercase">Total Catalog</p><h3 className="text-xl font-bold text-stone-900 mt-1">412</h3></div>
              <div className={`p-2.5 rounded-lg ${theme.light} ${theme.color}`}><ListMusic size={18}/></div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between">
              <div><p className="text-xs font-semibold text-stone-500 uppercase">CCLI Reports Due</p><h3 className="text-xl font-bold text-stone-900 mt-1">3</h3></div>
              <div className="p-2.5 rounded-lg bg-orange-50 text-orange-600"><AlertCircle size={18}/></div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between">
              <div><p className="text-xs font-semibold text-stone-500 uppercase">Rehearsal Tracks</p><h3 className="text-xl font-bold text-stone-900 mt-1">86%</h3></div>
              <div className="p-2.5 rounded-lg bg-teal-50 text-teal-600"><FileAudio size={18}/></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden h-fit">
            <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
              <h3 className="font-semibold text-stone-800">Song Catalog</h3>
              <div className="flex items-center gap-3">
                 <div className="relative hidden sm:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 h-3.5 w-3.5" />
                  <input type="text" placeholder="Search title or CCLI..." className="pl-8 pr-3 py-1.5 border border-stone-200 rounded-md text-xs outline-none focus:border-rose-500 w-48"/>
                 </div>
                 <button className={`text-sm font-medium ${theme.color} flex items-center gap-1`}>
                   <Filter size={14}/> Filter
                 </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="border-b border-stone-100 text-stone-500 font-medium">
                  <tr>
                    <th className="px-5 py-3">Song Title</th>
                    <th className="px-5 py-3">Key / BPM</th>
                    <th className="px-5 py-3">CCLI #</th>
                    <th className="px-5 py-3">Assets</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {SONG_LIBRARY.map((song) => (
                    <tr 
                      key={song.id} 
                      onClick={() => setSelectedSong(song)}
                      className={`cursor-pointer transition-colors ${selectedSong?.id === song.id ? 'bg-rose-50' : 'hover:bg-stone-50'}`}
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-stone-900">{song.title}</div>
                        <div className="text-xs text-stone-500 mt-0.5">{song.artist}</div>
                      </td>
                      <td className="px-5 py-4 text-stone-500">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-700 mr-2 border border-stone-200">{song.key}</span>
                        <span className="text-xs">{song.bpm} bpm</span>
                      </td>
                      <td className="px-5 py-4 text-stone-500 text-xs">
                        {song.ccli}<br/><span className="text-[10px] text-stone-400">Played: {song.lastPlayed}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`p-1.5 rounded-md ${song.hasLyrics ? 'bg-stone-100 text-stone-700' : 'bg-white text-stone-300 border border-stone-100'}`} title="Lyrics"><FileText size={14}/></span>
                          <span className={`p-1.5 rounded-md ${song.hasChords ? 'bg-stone-100 text-stone-700' : 'bg-white text-stone-300 border border-stone-100'}`} title="Chords"><Music size={14}/></span>
                          <span className={`p-1.5 rounded-md ${song.hasAudio ? 'bg-rose-100 text-rose-700' : 'bg-white text-stone-300 border border-stone-100'}`} title="Audio"><FileAudio size={14}/></span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {selectedSong ? (
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden h-fit flex flex-col animate-in slide-in-from-right-4 duration-300">
              <div className="p-5 border-b border-stone-100 bg-gradient-to-br from-stone-50 to-white flex justify-between items-start">
                <div>
                  <h2 className="font-bold text-lg text-stone-900 leading-tight">{selectedSong.title}</h2>
                  <p className="text-sm font-medium text-stone-500">{selectedSong.artist}</p>
                </div>
                <button onClick={() => setSelectedSong(null)} className="text-stone-400 hover:text-stone-600 text-xs font-semibold uppercase tracking-wider">Close</button>
              </div>

              <div className="p-5 border-b border-stone-100 bg-stone-900 text-white">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Rehearsal Track</span>
                  <span className="text-xs font-medium bg-stone-800 px-2 py-0.5 rounded text-rose-400">0:00 / 4:12</span>
                </div>
                <div className="w-full h-10 flex items-center gap-0.5 mb-4 opacity-70">
                   {Array.from({length: 40}).map((_, i) => (
                     <div key={i} className="flex-1 bg-rose-500 rounded-full" style={{ height: `${Math.max(10, Math.random() * 100)}%` }}></div>
                   ))}
                </div>
                <div className="flex justify-center items-center gap-6">
                  <button className="text-stone-300 hover:text-white"><SkipBack size={20}/></button>
                  <button onClick={() => setIsPlaying(!isPlaying)} className="w-12 h-12 bg-white text-stone-900 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg">
                    {isPlaying ? <Pause size={20} className="fill-current"/> : <Play size={20} className="fill-current ml-1"/>}
                  </button>
                  <button className="text-stone-300 hover:text-white"><SkipForward size={20}/></button>
                </div>
              </div>

              <div className="p-5 border-b border-stone-100 bg-stone-50 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Arrangement Key</label>
                  <select className="w-full p-2 border border-stone-200 rounded-md text-sm font-semibold text-stone-700 bg-white outline-none focus:border-rose-500">
                    <option>{selectedSong.key} (Default)</option>
                    <option>C</option>
                    <option>D</option>
                    <option>E</option>
                    <option>F</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Original Key</label>
                  <div className="p-2 border border-stone-200 rounded-md text-sm font-medium text-stone-500 bg-stone-100">
                    {selectedSong.originalKey}
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-white flex flex-col gap-2">
                <button className="w-full py-2 bg-stone-100 text-stone-700 rounded-md text-sm font-semibold hover:bg-stone-200 transition-colors flex justify-center items-center gap-2">
                  <FileText size={16}/> View Chord Chart
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden h-fit flex flex-col">
              <div className={`${theme.bg} p-4 text-white flex justify-between items-center`}>
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-white/80" />
                  <h3 className="font-semibold">AI Music Analyzer</h3>
                </div>
                <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded uppercase tracking-wider">Gemini</span>
              </div>
              
              <div className="p-4 bg-stone-50 border-b border-stone-200">
                <div className="flex gap-2 bg-white p-1 rounded-lg border border-stone-200">
                  <button onClick={() => setAnalysisMode('vocals')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors flex justify-center items-center gap-1.5 ${analysisMode === 'vocals' ? 'bg-rose-100 text-rose-700' : 'text-stone-500 hover:bg-stone-50'}`}><Mic2 size={14}/> Vocals</button>
                  <button onClick={() => setAnalysisMode('chords')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors flex justify-center items-center gap-1.5 ${analysisMode === 'chords' ? 'bg-rose-100 text-rose-700' : 'text-stone-500 hover:bg-stone-50'}`}><ListMusic size={14}/> Chords</button>
                  <button onClick={() => setAnalysisMode('lyrics')} className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors flex justify-center items-center gap-1.5 ${analysisMode === 'lyrics' ? 'bg-rose-100 text-rose-700' : 'text-stone-500 hover:bg-stone-50'}`}><FileText size={14}/> Lyrics</button>
                </div>
              </div>

              <div className="p-4 flex flex-col gap-4 flex-1">
                <textarea 
                  className="w-full p-3 border border-stone-200 rounded-lg text-sm focus:ring-1 focus:ring-rose-500 outline-none resize-none bg-stone-50"
                  placeholder="Paste lyrics or type a song title..."
                  rows="3"
                  value={musicPrompt}
                  onChange={(e) => setMusicPrompt(e.target.value)}
                ></textarea>
                <button 
                  onClick={handleMusicAnalysis}
                  disabled={isAnalyzingMusic || !musicPrompt}
                  className={`w-full py-2.5 ${theme.bg} text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity flex justify-center items-center gap-2 disabled:opacity-50`}
                >
                  {isAnalyzingMusic ? <Loader2 size={16} className="animate-spin" /> : 'Analyze Track'}
                </button>
                
                {musicAnalysisResult && (
                  <div className="mt-2 p-4 bg-stone-50 border border-stone-100 rounded-lg text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
                    {musicAnalysisResult.split('**').map((text, i) => i % 2 === 1 ? <strong key={i} className="text-stone-900">{text}</strong> : text)}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function PeopleApp({ theme, people, setPeople }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newPerson, setNewPerson] = useState({ name: '', email: '', phone: '', address: '', type: 'Guest', bgCheck: 'N/A' });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
       <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">People & Check-ins</h1>
          <p className="text-stone-500 text-sm mt-1">Manage profiles, background checks, and secure kids check-in.</p>
        </div>
        <div className="flex gap-3">
          <button className={`px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-md text-sm font-medium shadow-sm hover:bg-stone-50 flex items-center gap-2`}>
            <UserCheck size={16}/> Launch Check-in Station
          </button>
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
                <button onClick={() => {
                  if(newPerson.name) {
                    setPeople([{ id: Date.now(), ...newPerson }, ...people]);
                    setIsAdding(false);
                    setNewPerson({ name: '', email: '', phone: '', address: '', type: 'Guest', bgCheck: 'N/A' });
                  }
                }} className={`px-4 py-2 ${theme.bg} text-white rounded-md font-medium text-sm hover:opacity-90`}>Save Profile</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between">
          <div><p className="text-sm font-medium text-stone-500">Total Profiles</p><h3 className="text-2xl font-bold text-stone-900">{people.length}</h3></div>
          <div className={`p-3 rounded-lg ${theme.light} ${theme.color}`}><Users size={20}/></div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between">
          <div><p className="text-sm font-medium text-stone-500">New Guests (30d)</p><h3 className="text-2xl font-bold text-stone-900">24</h3></div>
          <div className="p-3 rounded-lg bg-sky-50 text-sky-600"><UserPlus size={20}/></div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between">
          <div><p className="text-sm font-medium text-stone-500">Scheduled This Week</p><h3 className="text-2xl font-bold text-stone-900">86</h3></div>
          <div className="p-3 rounded-lg bg-orange-50 text-orange-600"><CalendarDays size={20}/></div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
          <h3 className="font-semibold text-stone-800">Directory & Screening</h3>
          <div className="flex items-center gap-4">
             <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 h-4 w-4" />
              <input type="text" placeholder="Search people..." className="pl-9 pr-4 py-1.5 border border-stone-200 rounded-md text-sm outline-none focus:border-sky-500"/>
             </div>
             <button className={`text-sm font-medium ${theme.color} flex items-center gap-1`}><Filter size={14}/> Filter</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-stone-100 text-stone-500 font-medium">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Address</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Background Check</th>
                <th className="px-5 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {people.map((person) => (
                <tr key={person.id} className="hover:bg-stone-50 group">
                  <td className="px-5 py-3 font-medium text-stone-900 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${theme.light} ${theme.color}`}>
                      {person.name.charAt(0)}
                    </div>
                    {person.name}
                  </td>
                  <td className="px-5 py-3 text-stone-500">
                    <div className="flex flex-col"><span className="truncate">{person.email}</span><span className="text-xs">{person.phone}</span></div>
                  </td>
                  <td className="px-5 py-3 text-stone-500 text-xs">
                    {person.address}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-stone-600">{person.type}</span>
                  </td>
                  <td className="px-5 py-3">
                    {person.bgCheck === 'Clear' && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800"><ShieldCheck size={12} className="mr-1"/> Clear</span>}
                    {person.bgCheck === 'Pending' && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><Clock size={12} className="mr-1"/> Pending</span>}
                    {person.bgCheck === 'Expired' && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800"><AlertCircle size={12} className="mr-1"/> Expired</span>}
                    {person.bgCheck === 'N/A' && <span className="text-stone-300 text-xs">Not Required</span>}
                  </td>
                  <td className="px-5 py-3 text-right text-stone-400">
                    <button onClick={() => setPeople(people.filter(p => p.id !== person.id))} className="hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><AlertCircle size={18} className="ml-auto"/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GivingApp({ theme }) {
  const [reportResult, setReportResult] = useState(null);
  
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Financial Analytics & Giving</h1>
          <p className="text-stone-500 text-sm mt-1">Track donations, Zelle reconciliation, and generate insights.</p>
        </div>
        <div className="flex gap-2">
          <button className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}>
            <DollarSign size={16}/> Record Gift / Zelle Sync
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between">
          <div><p className="text-sm font-medium text-stone-500">YTD Giving</p><h3 className="text-2xl font-bold text-stone-900">$142,500</h3></div>
          <div className={`p-3 rounded-lg ${theme.light} ${theme.color}`}><TrendingUp size={20}/></div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between">
          <div><p className="text-sm font-medium text-stone-500">Recurring Donors</p><h3 className="text-2xl font-bold text-stone-900">184</h3></div>
          <div className="p-3 rounded-lg bg-teal-50 text-teal-600"><Users size={20}/></div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between">
          <div><p className="text-sm font-medium text-stone-500">Average Gift</p><h3 className="text-2xl font-bold text-stone-900">$185</h3></div>
          <div className="p-3 rounded-lg bg-orange-50 text-orange-600"><CreditCard size={20}/></div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
            <h3 className="font-semibold text-stone-800">Recent Transactions</h3>
            <button className={`text-sm font-medium ${theme.color}`}>View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-stone-100 text-stone-500 font-medium">
                <tr>
                  <th className="px-5 py-3">Donor</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Fund</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {RECENT_DONATIONS.map((donation) => (
                  <tr key={donation.id} className="hover:bg-stone-50">
                    <td className="px-5 py-4 font-medium text-stone-900">{donation.name}</td>
                    <td className="px-5 py-4 font-semibold text-teal-600">{donation.amount}</td>
                    <td className="px-5 py-4 text-stone-500">{donation.fund}</td>
                    <td className="px-5 py-4">
                       <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${donation.type === 'Zelle' ? 'bg-purple-100 text-purple-700' : 'bg-stone-100 text-stone-600'}`}>{donation.type}</span>
                    </td>
                    <td className="px-5 py-4 text-stone-500">{donation.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden h-fit">
          <div className={`${theme.bg} p-4 text-white flex justify-between items-center`}>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-white/80" />
              <h3 className="font-semibold">AI Data Analyst</h3>
            </div>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded uppercase tracking-wider">Gemini</span>
          </div>
          <div className="p-4 flex flex-col gap-4">
            <p className="text-xs text-stone-500">Ask Gemini to analyze giving trends, forecast budgets, or reconcile your Zelle transaction logs.</p>
            <textarea 
              className="w-full p-3 border border-stone-200 rounded-lg text-sm focus:ring-1 focus:ring-teal-500 outline-none resize-none bg-stone-50"
              placeholder="e.g., Match the uploaded Zelle CSV with our internal donor records..."
              rows="3"
            ></textarea>
            <button onClick={() => setReportResult(true)} className={`w-full py-2.5 ${theme.bg} text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity flex justify-center items-center gap-2`}>
              Generate Report
            </button>
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

function CalendarApp({ theme, events, setEvents }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: 'Feb 20, 2026', time: '', type: 'Meeting' });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Master Calendar</h1>
          <p className="text-stone-500 text-sm mt-1">February 2026</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-stone-100 rounded-md p-1">
            <button className="px-3 py-1 bg-white shadow-sm rounded text-sm font-medium text-stone-800">Month</button>
            <button className="px-3 py-1 text-stone-500 text-sm font-medium hover:text-stone-800">List</button>
          </div>
          <button onClick={() => setIsAdding(true)} className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}>
            <Plus size={16}/> New Event
          </button>
        </div>
      </div>

      {isAdding && (
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
                <button onClick={() => {
                  if(newEvent.title) {
                    setEvents([...events, { id: Date.now(), ...newEvent }]);
                    setIsAdding(false);
                    setNewEvent({ title: '', date: 'Feb 20, 2026', time: '', type: 'Meeting' });
                  }
                }} className={`px-4 py-2 ${theme.bg} text-white rounded-md font-medium text-sm hover:opacity-90`}>Save Event</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-3 text-center text-xs font-semibold text-stone-500 uppercase tracking-wider">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 grid-rows-5 bg-stone-200 gap-px">
          {Array.from({ length: 35 }).map((_, i) => {
            const dayNum = i - 0;
            const isCurrentMonth = dayNum > 0 && dayNum <= 28;
            const isAshWed = dayNum === 18;
            const isFirstSunday = dayNum === 22;
            
            return (
              <div key={i} className={`min-h-[120px] p-2 ${isCurrentMonth ? 'bg-white hover:bg-stone-50' : 'bg-stone-50'} transition-colors`}>
                <span className={`text-sm font-medium ${isCurrentMonth ? 'text-stone-700' : 'text-stone-400'}`}>
                  {isCurrentMonth ? dayNum : ''}
                </span>
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Comms & Workflows</h1>
          <p className="text-stone-500 text-sm mt-1">Manage automations, 2-way texting, and keywords.</p>
        </div>
        {activeSubTab === 'automations' && (
          <button className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}>
            <Plus size={16}/> New Workflow
          </button>
        )}
      </div>

      <div className="border-b border-stone-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button onClick={() => setActiveSubTab('automations')} className={`border-b-2 py-4 px-1 text-sm font-medium ${activeSubTab === 'automations' ? `${theme.border} ${theme.color}` : 'border-transparent text-stone-500 hover:text-stone-700'}`}>Automations</button>
          <button onClick={() => setActiveSubTab('inbox')} className={`border-b-2 py-4 px-1 text-sm font-medium flex items-center gap-2 ${activeSubTab === 'inbox' ? `${theme.border} ${theme.color}` : 'border-transparent text-stone-500 hover:text-stone-700'}`}>
            2-Way Inbox <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">3</span>
          </button>
          <button onClick={() => setActiveSubTab('keywords')} className={`border-b-2 py-4 px-1 text-sm font-medium ${activeSubTab === 'keywords' ? `${theme.border} ${theme.color}` : 'border-transparent text-stone-500 hover:text-stone-700'}`}>Keywords</button>
        </nav>
      </div>

      {activeSubTab === 'automations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden h-fit">
            <div className="p-4 border-b border-stone-100 bg-stone-50/50">
              <h2 className="font-semibold text-stone-800">AI Outreach Generator</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase">Audience</label>
                <select className="w-full p-2 border border-stone-200 rounded text-sm bg-white outline-none focus:ring-1 focus:ring-violet-500">
                  <option>First-Time Guests</option>
                  <option>Lapsed Volunteers</option>
                </select>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-stone-500 uppercase">Prompt</label>
                  <Sparkles size={12} className={theme.color}/>
                </div>
                <textarea 
                  className="w-full p-2 border border-stone-200 rounded text-sm bg-white outline-none focus:ring-1 focus:ring-violet-500 resize-none h-24"
                  placeholder="Draft a warm welcome text..."
                ></textarea>
              </div>
              <button className={`w-full py-2 bg-stone-900 text-white rounded text-sm font-medium hover:bg-stone-800 transition-colors`}>
                Generate Draft
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
               <div className="p-4 border-b border-stone-100 bg-stone-50/50">
                <h2 className="font-semibold text-stone-800">Active Automations</h2>
              </div>
              <div className="divide-y divide-stone-100">
                <WorkflowCard title="Post-Service Guest Text" trigger="Added to 'New Guest' list" actions="Send SMS, Assign Task" icon={Smartphone} />
                <WorkflowCard title="Volunteer Reminder" trigger="3 Days Before Scheduled Date" actions="Send Email" icon={Mail} />
                <WorkflowCard title="Lapsed Giver Alert" trigger="No giving in 30 days" actions="Notify Pastor" icon={AlertCircle} />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'inbox' && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden h-[500px] flex animate-in fade-in duration-300">
          <div className="w-1/3 border-r border-stone-200 flex flex-col bg-stone-50/50">
            <div className="p-4 border-b border-stone-200">
               <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 h-4 w-4" />
                <input type="text" placeholder="Search conversations..." className="w-full pl-9 pr-4 py-1.5 border border-stone-300 rounded-md text-sm outline-none focus:border-violet-500"/>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
              <div className="p-4 bg-white border-l-4 border-violet-500 cursor-pointer">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-stone-900 text-sm">Sarah Jenkins</h4>
                  <span className="text-xs text-stone-400">10:42 AM</span>
                </div>
                <p className="text-xs text-stone-600 truncate font-medium">Thank you! What time is youth group?</p>
              </div>
              <div className="p-4 hover:bg-white cursor-pointer transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-semibold text-stone-700 text-sm">Mark Davis</h4>
                  <span className="text-xs text-stone-400">Yesterday</span>
                </div>
                <p className="text-xs text-stone-500 truncate">I'll be there this Sunday.</p>
              </div>
            </div>
          </div>
          <div className="flex-1 flex flex-col bg-white">
            <div className="p-4 border-b border-stone-200 flex justify-between items-center">
              <h3 className="font-bold text-stone-900">Sarah Jenkins</h3>
              <button className="text-stone-400 hover:text-stone-600"><MoreVertical size={18}/></button>
            </div>
            <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto bg-stone-50/30">
              <div className="self-end bg-violet-600 text-white p-3 rounded-2xl rounded-tr-sm max-w-[75%] text-sm">
                Hi Sarah! Thanks for visiting Lifegate yesterday. We loved having you. Do you have any questions about the church?
              </div>
              <div className="self-start bg-stone-200 text-stone-800 p-3 rounded-2xl rounded-tl-sm max-w-[75%] text-sm">
                Thank you! What time is youth group?
              </div>
            </div>
            <div className="p-4 border-t border-stone-200 bg-white">
              <div className="flex gap-2">
                <input type="text" placeholder="Type an SMS reply..." className="flex-1 p-2 border border-stone-300 rounded-md text-sm outline-none focus:border-violet-500" />
                <button className="px-4 py-2 bg-violet-600 text-white rounded-md text-sm font-medium hover:bg-violet-700"><Send size={16}/></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'keywords' && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden animate-in fade-in duration-300">
          <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
            <h3 className="font-semibold text-stone-800">Active Text Keywords</h3>
            <button className="text-sm text-violet-600 font-medium flex items-center gap-1"><Plus size={14}/> Add Keyword</button>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="border-b border-stone-100 text-stone-500 font-medium">
              <tr>
                <th className="px-5 py-3">Keyword</th>
                <th className="px-5 py-3">Auto-Reply Message</th>
                <th className="px-5 py-3">Action Triggered</th>
                <th className="px-5 py-3 text-right">Uses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              <tr className="hover:bg-stone-50">
                <td className="px-5 py-4 font-bold text-stone-900"><Hash size={14} className="inline text-stone-400 mr-1"/>GUEST</td>
                <td className="px-5 py-4 text-stone-600 truncate max-w-xs">Welcome to Lifegate! Click here to fill out a quick connect card...</td>
                <td className="px-5 py-4 text-stone-500">Add to "New Guests" list</td>
                <td className="px-5 py-4 text-right font-medium">142</td>
              </tr>
              <tr className="hover:bg-stone-50">
                <td className="px-5 py-4 font-bold text-stone-900"><Hash size={14} className="inline text-stone-400 mr-1"/>BAPTISM</td>
                <td className="px-5 py-4 text-stone-600 truncate max-w-xs">Awesome! Baptism is a huge step. Here is the info on our next class...</td>
                <td className="px-5 py-4 text-stone-500">Add to "Baptism Class" list</td>
                <td className="px-5 py-4 text-right font-medium">18</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SecurityApp({ theme }) {
  const [is2FA, setIs2FA] = useState(true);
  const [isDLP, setIsDLP] = useState(true);
  const [isPII, setIsPII] = useState(true);
  const [isOptOut, setIsOptOut] = useState(true);
  const [isEndpoint, setIsEndpoint] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Workspace Security</h1>
          <p className="text-stone-500 text-sm mt-1">Manage authentication, data loss prevention (DLP), and AI governance.</p>
        </div>
        <div className="flex gap-2">
          <button className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}>
             Save Security Settings
          </button>
        </div>
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
                  <p className="text-xs text-stone-500 mt-1 max-w-md">Require all staff and team leaders to use a secondary authentication method (Authenticator App or SMS) when logging in.</p>
                </div>
                <div onClick={() => setIs2FA(!is2FA)}>
                  {is2FA ? <ToggleRight size={36} className="text-emerald-500 cursor-pointer"/> : <ToggleLeft size={36} className="text-stone-300 cursor-pointer"/>}
                </div>
              </div>
              <div className="p-5 flex justify-between items-center hover:bg-stone-50 transition-colors">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">Advanced Endpoint Management</h4>
                  <p className="text-xs text-stone-500 mt-1 max-w-md">Allow admins to remotely wipe church data from personal mobile devices if a volunteer's phone is lost or stolen.</p>
                </div>
                <div onClick={() => setIsEndpoint(!isEndpoint)}>
                  {isEndpoint ? <ToggleRight size={36} className="text-emerald-500 cursor-pointer"/> : <ToggleLeft size={36} className="text-stone-300 cursor-pointer"/>}
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
                  <p className="text-xs text-stone-500 mt-1 max-w-md">Automatically scan internal chats and documents to prevent users from sharing sensitive congregant data (SSNs, Credit Cards) externally.</p>
                </div>
                <div onClick={() => setIsDLP(!isDLP)}>
                  {isDLP ? <ToggleRight size={36} className="text-emerald-500 cursor-pointer"/> : <ToggleLeft size={36} className="text-stone-300 cursor-pointer"/>}
                </div>
              </div>
              <div className="p-5 flex justify-between items-center hover:bg-stone-50 transition-colors">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">PII Data Masking for AI</h4>
                  <p className="text-xs text-stone-500 mt-1 max-w-md">Automatically redact names, phone numbers, and addresses before sending any context to Gemini AI to ensure pastoral confidentiality.</p>
                </div>
                <div onClick={() => setIsPII(!isPII)}>
                  {isPII ? <ToggleRight size={36} className="text-emerald-500 cursor-pointer"/> : <ToggleLeft size={36} className="text-stone-300 cursor-pointer"/>}
                </div>
              </div>
              <div className="p-5 flex justify-between items-center hover:bg-stone-50 transition-colors">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">LLM Training Opt-Out</h4>
                  <p className="text-xs text-stone-500 mt-1 max-w-md">Enforce Google Workspace privacy policy ensuring your church's internal data is never used to train public generative models.</p>
                </div>
                <div onClick={() => setIsOptOut(!isOptOut)}>
                  {isOptOut ? <ToggleRight size={36} className="text-emerald-500 cursor-pointer"/> : <ToggleLeft size={36} className="text-stone-300 cursor-pointer"/>}
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
                <span className="text-sm font-medium text-stone-700">Lead Pastors</span>
                <span className="text-xs font-bold bg-stone-100 text-stone-700 px-2 py-1 rounded">Full Admin</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-stone-700">Staff / Directors</span>
                <span className="text-xs font-bold bg-stone-100 text-stone-700 px-2 py-1 rounded">Editor Access</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-stone-700">Volunteers</span>
                <span className="text-xs font-bold bg-rose-50 text-rose-700 px-2 py-1 rounded">No System Access</span>
              </div>
              <button className="w-full mt-2 py-2 border border-stone-200 rounded text-xs font-semibold text-stone-600 hover:bg-stone-50">Manage Roles</button>
            </div>
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

function QuickActionButton({ icon: Icon, label, color }) {
  return (
    <button className={`p-4 rounded-lg border flex flex-col items-center justify-center gap-2 transition-colors ${color}`}>
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
