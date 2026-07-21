import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ChevronRight,
  DollarSign,
  Send,
  UserPlus,
  Users,
} from 'lucide-react';
import HomeMetricCard from '../components/HomeMetricCard';
import QuickActionButton from '../components/QuickActionButton';
import { SkeletonCard } from '../components/Skeleton';

export default function HomeApp({ events, people, isAdmin, isSeniorPastor, setActiveApp, loadingPeople, loadingEvents, user }) {
  const formatEventDate = (dateStr, timeStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(`${dateStr}T00:00:00`);
      const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${formattedDate} • ${timeStr || ''}`;
    } catch {
      return dateStr;
    }
  };

  const today = new Date();
  const weekLabel = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const hour = today.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const firstName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || null;
  const greetingName = firstName || (isSeniorPastor ? 'Pastor' : isAdmin ? 'Admin' : 'Volunteer');

  const nextEvent = events?.[0] || null;
  const kidsCount = people.filter((person) => person.type === 'Child').length;
  const volunteersCount = people.filter((person) => person.type === 'Volunteer').length;
  const completion = Math.min(100, Math.max(25, Math.round((volunteersCount / Math.max(1, people.length)) * 160)));

  const roleTracks = isSeniorPastor
    ? [
        { title: 'Care Flow', desc: 'Review new family follow-ups', app: 'community' },
        { title: 'Worship Alignment', desc: 'Confirm service run-of-show', app: 'services' },
        { title: 'Pastoral Insights', desc: 'Audit pastoral team updates', app: 'reporting' },
      ]
    : isAdmin
      ? [
          { title: 'People Ops', desc: 'Resolve profile and check-in gaps', app: 'people' },
          { title: 'Giving Review', desc: 'Confirm weekly giving trend', app: 'giving' },
          { title: 'Execution', desc: 'Lock event timelines and teams', app: 'calendar' },
        ]
      : [
          { title: 'Serving', desc: 'Review your current assignments', app: 'services' },
          { title: 'Community', desc: 'Follow up with recent guests', app: 'community' },
          { title: 'Preparation', desc: 'Check this week timeline notes', app: 'calendar' },
        ];

  return (
    <div className="space-y-6 text-left">
      <section className="rounded-3xl border border-white/60 bg-white/70 p-5 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-14 h-36 w-36 rounded-full bg-gradient-to-br from-cyan-200/40 to-teal-200/30 blur-2xl" />
        <div className="absolute left-1/2 -bottom-16 h-36 w-36 rounded-full bg-gradient-to-br from-amber-200/40 to-orange-200/30 blur-2xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-stone-500 mb-2">Executive Board</p>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold leading-[1.06] text-stone-900">{greeting}, {greetingName}</h1>
            <p className="text-sm text-stone-500 mt-2">Operational summary for {weekLabel}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveApp('calendar')}
              className="inline-flex items-center gap-2 rounded-full bg-stone-900 text-white px-5 py-2.5 text-sm font-bold"
            >
              Open Calendar
              <ArrowUpRight size={14} />
            </button>
            <button
              onClick={() => setActiveApp('services')}
              className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white/70 px-5 py-2.5 text-sm font-semibold text-stone-800"
            >
              Service Desk
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {loadingEvents ? <SkeletonCard /> : <HomeMetricCard title="Upcoming Services" value={events.length} label="Scheduled" color="text-sky-600" />}
            {loadingPeople ? <SkeletonCard /> : <HomeMetricCard title="Profiles" value={people.length} label="Total" color="text-emerald-600" />}
            {loadingPeople ? <SkeletonCard /> : <HomeMetricCard title="Children" value={kidsCount} label="Kid Ministry" color="text-orange-600" />}
            <HomeMetricCard title="Readiness" value={`${completion}%`} label="Coverage" color={isAdmin ? 'text-teal-600' : 'text-violet-600'} />
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white/80 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-stone-900">Next Event Snapshot</h3>
              <CalendarDays size={16} className="text-stone-400" />
            </div>
            <p className="text-2xl font-bold text-stone-900">{nextEvent?.title || 'No scheduled events yet'}</p>
            <p className="text-sm text-stone-500 mt-1">{nextEvent ? formatEventDate(nextEvent.date, nextEvent.time) : 'Create an event to activate timeline planning.'}</p>

            <div className="mt-4 h-2 rounded-full bg-stone-200 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-sky-500 via-teal-500 to-amber-500 transition-all duration-700" style={{ width: `${completion}%` }} />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
              <div className="rounded-lg bg-stone-50 p-3 border border-stone-100">
                <p className="text-stone-500">Volunteers</p>
                <p className="text-lg font-bold text-stone-900 mt-1">{volunteersCount}</p>
              </div>
              <div className="rounded-lg bg-stone-50 p-3 border border-stone-100">
                <p className="text-stone-500">Open Slots</p>
                <p className="text-lg font-bold text-stone-900 mt-1">{Math.max(0, 36 - volunteersCount)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white/80 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-stone-900">Role Tracks</h3>
              <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-stone-500">Adaptive</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {roleTracks.map((lane) => (
                <button
                  key={lane.title}
                  onClick={() => setActiveApp(lane.app)}
                  className="text-left p-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 transition-colors"
                >
                  <p className="text-[10px] uppercase tracking-[0.15em] text-stone-500 font-bold">{lane.title}</p>
                  <p className="mt-1 text-sm font-semibold text-stone-900">{lane.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-stone-200 bg-white/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-800">Action Center</h2>
            <Users size={16} className="text-stone-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            <QuickActionButton icon={BookOpen} label="View Services" color="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200" onClick={() => setActiveApp('services')} />
            {isAdmin && <QuickActionButton icon={UserPlus} label="Add a Person" color="bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200" onClick={() => setActiveApp('people')} />}
            {isAdmin && <QuickActionButton icon={DollarSign} label="Open Giving" color="bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200" onClick={() => setActiveApp('giving')} />}
            {isAdmin && <QuickActionButton icon={Send} label="Send Message" color="bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200" onClick={() => setActiveApp('workflows')} />}
          </div>

          <div className="mt-5 border-t border-stone-100 pt-4">
            <h3 className="text-sm font-semibold text-stone-800 mb-3">Upcoming Timeline</h3>
            <div className="space-y-2">
              {events.slice(0, 3).map((event) => (
                <button
                  key={event.id}
                  onClick={() => setActiveApp('calendar')}
                  className="w-full text-left p-3 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-stone-900 truncate">{event.title}</p>
                    <ChevronRight size={14} className="text-stone-400 shrink-0" />
                  </div>
                  <p className="text-xs text-stone-500 mt-1">{formatEventDate(event.date, event.time)}</p>
                </button>
              ))}
              {events.length === 0 && (
                <p className="text-sm text-stone-500">No events yet. Add one from Calendar.</p>
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
