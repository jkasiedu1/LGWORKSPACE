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

export default function HomeApp({ events, people, isAdmin, isSeniorPastor, setActiveApp }) {
  const formatEventDate = (dateStr, timeStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${formattedDate} • ${timeStr || ''}`;
    } catch { return dateStr; }
  };

  const today = new Date();
  const weekLabel = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const nextEvent = events?.[0] || null;
  const kidsCount = people.filter((person) => person.type === 'Child').length;
  const volunteersCount = people.filter((person) => person.type === 'Volunteer').length;

  const completion = Math.min(100, Math.max(25, Math.round((volunteersCount / Math.max(1, people.length)) * 160)));

  const missionLanes = isSeniorPastor
    ? [
      { title: 'Shepherding', desc: 'Review follow-ups for new families.', app: 'community' },
      { title: 'Vision', desc: 'Align Sunday flow with worship team.', app: 'services' },
      { title: 'Care', desc: 'Check pastoral care check-ins.', app: 'people' },
    ]
    : isAdmin
      ? [
        { title: 'Operations', desc: 'Fill team gaps and run check-in flow.', app: 'people' },
        { title: 'Finance', desc: 'Reconcile giving and trend deltas.', app: 'giving' },
        { title: 'Coordination', desc: 'Confirm event schedule readiness.', app: 'calendar' },
      ]
      : [
        { title: 'Serve', desc: 'Review assigned ministry tasks.', app: 'services' },
        { title: 'Connect', desc: 'Welcome and follow up with guests.', app: 'community' },
        { title: 'Prepare', desc: 'Check this week timeline and notes.', app: 'calendar' },
      ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      <div className="rounded-2xl border border-white/70 bg-gradient-to-r from-white to-stone-50 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
              {isSeniorPastor ? 'Good Morning, Pastor' : isAdmin ? 'Good Morning, Admin' : 'Welcome back, Volunteer'}
            </h1>
            <p className="text-stone-500 text-sm mt-2">Ministry pulse for {weekLabel}</p>
          </div>
          <button
            onClick={() => setActiveApp('calendar')}
            className="inline-flex items-center gap-2 rounded-full bg-stone-900 text-white px-4 py-2 text-sm font-semibold hover:bg-stone-800 transition-colors"
          >
            Open Calendar
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 rounded-2xl border border-white/80 bg-white/80 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Next Event</p>
                <h2 className="font-semibold text-stone-900 text-xl mt-1">{nextEvent?.title || 'No scheduled events yet'}</h2>
                <p className="text-sm text-stone-500 mt-1">{nextEvent ? formatEventDate(nextEvent.date, nextEvent.time) : 'Create an event to populate your dashboard'}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-stone-900 text-white flex items-center justify-center">
                <CalendarDays size={20} />
              </div>
            </div>
          </div>

          <HomeMetricCard title="Upcoming Services" value={events.length} label="Scheduled" color="text-amber-600" />
          <HomeMetricCard title="Total Profiles" value={people.length} label="In Database" color="text-sky-600" />
          <HomeMetricCard title="Children" value={kidsCount} label="In Kids Ministry" color="text-rose-600" />
          {isAdmin ? (
            <HomeMetricCard title="Weekly Giving" value="$14.2k" label="Ahead of Goal" color="text-teal-600" />
          ) : (
            <HomeMetricCard title="Serve Team" value={`${completion}%`} label="Filled for Sunday" color="text-orange-600" />
          )}

          <div className="md:col-span-2 rounded-2xl border border-white/80 bg-white/80 shadow-sm p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-stone-900">Team Readiness</h3>
              <span className="text-xs font-semibold text-stone-500">{completion}% complete</span>
            </div>
            <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-700"
                style={{ width: `${completion}%` }}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-stone-50 p-3">
                <p className="text-stone-500">Volunteers</p>
                <p className="mt-1 text-lg font-bold text-stone-900">{volunteersCount}</p>
              </div>
              <div className="rounded-lg bg-stone-50 p-3">
                <p className="text-stone-500">Open Slots</p>
                <p className="mt-1 text-lg font-bold text-stone-900">{Math.max(0, 36 - volunteersCount)}</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 rounded-2xl border border-white/80 bg-white/80 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-stone-900">Today&apos;s Mission</h3>
              <span className="text-[10px] uppercase tracking-wider font-bold text-stone-500">Role Adaptive</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {missionLanes.map((lane) => (
                <button
                  key={lane.title}
                  onClick={() => setActiveApp(lane.app)}
                  className="text-left p-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 transition-colors"
                >
                  <p className="text-xs uppercase tracking-wider text-stone-500 font-bold">{lane.title}</p>
                  <p className="mt-1 text-sm font-semibold text-stone-900">{lane.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 rounded-2xl border border-white/80 bg-white/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-800">Quick Actions</h2>
            <Users size={16} className="text-stone-400" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
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
                  className="w-full text-left p-3 rounded-lg border border-stone-200 hover:border-stone-300 hover:bg-stone-50 transition-colors"
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
        </div>
      </div>
    </div>
  );
}
