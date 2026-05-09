import { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Calendar,
  Download,
  Eye,
  PieChart,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';

const FUND_COLORS = ['#14b8a6', '#0ea5e9', '#f59e0b', '#e11d48', '#8b5cf6', '#10b981'];

function parseAmount(amt) {
  const num = parseFloat(String(amt || '').replace(/[$,]/g, ''));
  return isNaN(num) ? 0 : num;
}

export default function ReportingApp({ theme, people = [], donations = [], events = [], teamsList = [] }) {
  const [viewMode, setViewMode] = useState('story');

  // Stats derived from real people data
  const stats = useMemo(() => {
    const adults = people.filter(p => p.type !== 'Child');
    const total = adults.length;
    const volunteers = adults.filter(p => p.type === 'Volunteer').length;
    const staff = adults.filter(p => p.type === 'Staff').length;
    const guests = people.filter(p => ['First Time', 'Guest'].includes(p.type)).length;
    const volunteerRate = total > 0 ? Math.round(((volunteers + staff) / total) * 100) : 0;
    return { total, guests, volunteerRate, teamsCount: teamsList.length };
  }, [people, teamsList]);

  // Monthly event counts — last 6 months (value normalized 10–90 for chart rendering)
  const attendanceData = useMemo(() => {
    const now = new Date();
    const raw = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short' });
      const count = events.filter(e => e.date?.startsWith(key)).length;
      raw.push({ label, rawCount: count });
    }
    const max = Math.max(...raw.map(r => r.rawCount), 1);
    return raw.map(r => ({
      label: r.label,
      rawCount: r.rawCount,
      value: Math.round((r.rawCount / max) * 80) + 10,
    }));
  }, [events]);

  // Member type demographics (adults only)
  const demographics = useMemo(() => {
    const adults = people.filter(p => p.type !== 'Child');
    const total = adults.length || 1;
    const groups = [
      { label: 'Members',          types: ['Member'],                        color: 'bg-sky-500' },
      { label: 'Volunteers & Staff', types: ['Volunteer', 'Staff'],           color: 'bg-fuchsia-500' },
      { label: 'Guests & New',     types: ['First Time', 'Guest', 'Returning'], color: 'bg-amber-500' },
    ];
    const computed = groups.map(g => ({ ...g, count: adults.filter(p => g.types.includes(p.type)).length }));
    const knownCount = computed.reduce((s, g) => s + g.count, 0);
    const otherCount = total - knownCount;
    if (otherCount > 0) computed.push({ label: 'Other', types: [], count: otherCount, color: 'bg-emerald-500' });
    return computed.map(g => ({ label: g.label, color: g.color, percent: Math.round((g.count / total) * 100) }));
  }, [people]);

  // Giving breakdown by fund
  const givingStats = useMemo(() => {
    const total = donations.reduce((sum, d) => sum + parseAmount(d.amount), 0);
    const byFund = {};
    donations.forEach(d => {
      const fund = d.fund || 'General';
      byFund[fund] = (byFund[fund] || 0) + parseAmount(d.amount);
    });
    const fundList = Object.entries(byFund)
      .map(([label, amount]) => ({ label, amount, percent: total > 0 ? Math.round((amount / total) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount);
    let accumulated = 0;
    const conicGradient = fundList.length
      ? fundList.map((fund, i) => {
          const start = accumulated;
          accumulated += fund.percent;
          return `${FUND_COLORS[i % FUND_COLORS.length]} ${start}% ${accumulated}%`;
        }).join(', ')
      : '#e7e5e4 0% 100%';
    const totalLabel = total >= 1000 ? `$${(total / 1000).toFixed(1)}k` : `$${total.toFixed(0)}`;
    return { total, fundList, conicGradient, totalLabel };
  }, [donations]);

  const handleExport = () => {
    const adults = people.filter(p => p.type !== 'Child');
    const rows = [
      ['Metric', 'Value'],
      ['Total Adults', adults.length],
      ['First-Time Guests', people.filter(p => ['First Time', 'Guest'].includes(p.type)).length],
      ['Volunteers', people.filter(p => p.type === 'Volunteer').length],
      ['Staff', people.filter(p => p.type === 'Staff').length],
      ['Active Teams', teamsList.length],
      ['Total Giving', `$${givingStats.total.toFixed(2)}`],
      [],
      ['Month', 'Events Scheduled'],
      ...attendanceData.map(d => [d.label, d.rawCount]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lifegate-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const points = useMemo(() => {
    const max = Math.max(...attendanceData.map((item) => item.value));
    const min = Math.min(...attendanceData.map((item) => item.value));
    return attendanceData.map((item, index) => {
      const x = (index / (attendanceData.length - 1)) * 100;
      const y = 100 - (((item.value - min) / (max - min || 1)) * 70 + 10);
      return { ...item, x, y };
    });
  }, [attendanceData]);

  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = `${linePath} L 100 100 L 0 100 Z`;

  const attendanceDelta = useMemo(() => {
    const first = attendanceData[0]?.rawCount ?? 0;
    const last = attendanceData[attendanceData.length - 1]?.rawCount ?? 0;
    if (first === 0) return last > 0 ? 100 : 0;
    return Math.round(((last - first) / first) * 100);
  }, [attendanceData]);

  const narrativeHeadline = attendanceDelta > 0
    ? `Ministry activity grew ${attendanceDelta}% in monthly events over the last 6 months.`
    : attendanceDelta < 0
      ? `Ministry activity dipped ${Math.abs(attendanceDelta)}% — an opportunity for renewed momentum.`
      : 'Ministry activity is holding steady across the last 6 months.';

  const guestSignal = stats.guests > 0;
  const volunteerWatch = stats.volunteerRate < 20;
  const largestDemoLabel = demographics[0]?.label ?? 'Members';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Insights &amp; Reports</h1>
          <p className="text-stone-500 text-sm mt-1">Live analytics from your Lifegate directory, events, and giving.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="inline-flex p-1 rounded-xl bg-white border border-stone-200 shadow-sm">
            <button
              onClick={() => setViewMode('story')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${viewMode === 'story' ? 'bg-stone-900 text-white' : 'text-stone-600'}`}
            >
              Story Mode
            </button>
            <button
              onClick={() => setViewMode('overview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${viewMode === 'overview' ? 'bg-stone-900 text-white' : 'text-stone-600'}`}
            >
              Overview
            </button>
          </div>
          <button onClick={handleExport} className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center justify-center gap-2`}>
            <Download size={16}/> Export Report
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/80 bg-gradient-to-r from-white to-stone-50 p-5 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5 items-start">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-900 text-white text-[10px] uppercase tracking-wider font-bold">
              <Sparkles size={12} />
              Live Narrative Insight
            </div>
            <h2 className="mt-3 text-xl sm:text-2xl font-bold text-stone-900">{narrativeHeadline}</h2>
            <p className="mt-2 text-sm text-stone-600">
              Your directory has {stats.total} adults and {stats.guests} registered guest{stats.guests !== 1 ? 's' : ''}. Volunteers and staff represent {stats.volunteerRate}% of your congregation.
            </p>
          </div>
          <div className="rounded-xl bg-white border border-stone-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Action Focus</p>
            <ul className="mt-3 space-y-2 text-sm text-stone-700">
              {guestSignal && <li className="flex items-start gap-2"><Eye size={14} className="mt-0.5 text-teal-600" /> Follow up with {stats.guests} guest{stats.guests !== 1 ? 's' : ''} within 48 hours.</li>}
              {volunteerWatch && <li className="flex items-start gap-2"><Eye size={14} className="mt-0.5 text-teal-600" /> Volunteer rate is {stats.volunteerRate}% — consider recruiting at next service.</li>}
              {givingStats.total > 0 && <li className="flex items-start gap-2"><Eye size={14} className="mt-0.5 text-teal-600" /> ${givingStats.total.toLocaleString('en-US', { maximumFractionDigits: 0 })} in recorded giving — review fund allocation.</li>}
              {!guestSignal && !volunteerWatch && givingStats.total === 0 && <li className="flex items-start gap-2"><Eye size={14} className="mt-0.5 text-teal-600" /> Add events to Calendar and people to your Directory to populate insights.</li>}
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-stone-500">Adults in Directory</span>
            <div className={`p-1.5 rounded-md ${theme.light} ${theme.color}`}><Users size={16}/></div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold tracking-tight text-stone-900">{stats.total}</span>
            <div className="flex items-center gap-1 mt-1 text-stone-400 text-xs font-semibold">All congregation adults</div>
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">Live Data</div>
            <p className="mt-2 text-[11px] text-stone-500">Count of all non-child profiles in your directory.</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-stone-500">First-Time Guests</span>
            <div className="p-1.5 rounded-md bg-sky-50 text-sky-600"><UserPlus size={16}/></div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold tracking-tight text-stone-900">{stats.guests}</span>
            <div className="flex items-center gap-1 mt-1 text-stone-400 text-xs font-semibold">Registered in directory</div>
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10px] font-bold uppercase tracking-wider">Live Data</div>
            <p className="mt-2 text-[11px] text-stone-500">Profiles marked as First Time or Guest.</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-stone-500">Volunteer &amp; Staff Rate</span>
            <div className="p-1.5 rounded-md bg-amber-50 text-amber-600"><Activity size={16}/></div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold tracking-tight text-stone-900">{stats.volunteerRate}%</span>
            <div className={`flex items-center gap-1 mt-1 ${stats.volunteerRate >= 20 ? 'text-emerald-600' : 'text-rose-600'} text-xs font-semibold`}>
              {stats.volunteerRate >= 20 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
              {stats.volunteerRate >= 20 ? 'Healthy engagement' : 'Below 20% target'}
            </div>
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider">Live Data</div>
            <p className="mt-2 text-[11px] text-stone-500">Volunteers + Staff as % of all adults.</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-stone-500">Active Teams</span>
            <div className="p-1.5 rounded-md bg-teal-50 text-teal-600"><PieChart size={16}/></div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold tracking-tight text-stone-900">{stats.teamsCount}</span>
            <div className="flex items-center gap-1 mt-1 text-stone-400 text-xs font-semibold">Ministry teams configured</div>
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[10px] font-bold uppercase tracking-wider">Live Data</div>
            <p className="mt-2 text-[11px] text-stone-500">Total teams in your Teams directory.</p>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${viewMode === 'story' ? 'xl:grid-cols-[1.4fr_1fr]' : 'lg:grid-cols-2'} gap-6`}>
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-stone-800 flex items-center gap-2"><Activity size={18} className="text-violet-500"/> Monthly Events Scheduled</h3>
            <span className="text-xs text-stone-500 font-medium">Last 6 Months</span>
          </div>
          <div className="relative w-full h-64 bg-stone-50 rounded-xl border border-stone-100 overflow-hidden">
            {events.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 text-sm text-center p-4">
                <Calendar size={32} className="mb-2 opacity-30" />
                <p>Add events in Calendar to see monthly trends here.</p>
              </div>
            ) : (
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                <defs>
                  <linearGradient id="attendanceGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity="0.42" />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity="0.04" />
                  </linearGradient>
                </defs>
                {[20, 40, 60, 80].map((y) => (
                  <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#e7e5e4" strokeWidth="0.5" />
                ))}
                <path d={areaPath} fill="url(#attendanceGradient)" />
                <path d={linePath} fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {points.map((point) => (
                  <circle key={`dot-${point.label}`} cx={point.x} cy={point.y} r="1.4" fill="#0f172a" />
                ))}
              </svg>
            )}
            <div className="absolute inset-x-3 bottom-2 grid grid-cols-6 text-[10px] text-stone-500 font-semibold">
              {attendanceData.map((item) => <span key={`x-${item.label}`} className="text-center">{item.label}</span>)}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-lg bg-stone-50 p-3 border border-stone-100">
              <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Peak</p>
              <p className="text-lg font-bold text-stone-900 mt-1">{Math.max(...attendanceData.map((item) => item.rawCount))}</p>
            </div>
            <div className="rounded-lg bg-stone-50 p-3 border border-stone-100">
              <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Total Events</p>
              <p className="text-lg font-bold text-stone-900 mt-1">{events.length}</p>
            </div>
            <div className="rounded-lg bg-stone-50 p-3 border border-stone-100 col-span-2 sm:col-span-1">
              <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Trend</p>
              <p className={`text-lg font-bold mt-1 ${attendanceDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{attendanceDelta >= 0 ? '+' : ''}{attendanceDelta}%</p>
            </div>
          </div>
        </div>

        {/* Attendance Growth Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-stone-800 flex items-center gap-2"><BarChart3 size={18} className={theme.color}/> Events Per Month</h3>
            <span className="text-xs text-stone-500 font-medium">Last 6 Months</span>
          </div>
          <div className="flex-1 flex items-end justify-between gap-2 h-48 relative">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none border-b border-stone-200 pb-6">
              {[0,1,2,3].map(i => <div key={i} className="border-b border-stone-100 border-dashed w-full h-0"></div>)}
            </div>
            {attendanceData.map((data, index) => (
              <div key={index} className="flex flex-col items-center flex-1 z-10 group">
                <div className="w-full max-w-[40px] bg-fuchsia-100 hover:bg-fuchsia-200 rounded-t-md relative transition-all duration-300 flex items-end justify-center" style={{ height: `${data.value}%` }}>
                  <div className={`${theme.bg} w-full rounded-t-sm transition-all duration-500`} style={{ height: `${data.value - 20}%` }}></div>
                  <div className="absolute -top-8 bg-stone-800 text-white text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {data.rawCount} event{data.rawCount !== 1 ? 's' : ''}
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-stone-400 mt-2 uppercase tracking-wide">{data.label}</span>
              </div>
            ))}
          </div>
        </div>

        {viewMode === 'overview' && (
        <>
        {/* Fund Designation Pie */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-stone-800 flex items-center gap-2"><PieChart size={18} className="text-teal-500"/> Fund Designation</h3>
            <span className="text-xs text-stone-500 font-medium">All Recorded Giving</span>
          </div>
          {givingStats.total === 0 ? (
            <div className="flex-1 flex items-center justify-center text-stone-400 text-sm text-center py-8">
              <p>No giving recorded yet. Add donations in the Giving app.</p>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center gap-8 flex-wrap">
              <div
                className="relative flex-shrink-0 flex items-center justify-center w-48 h-48 rounded-full"
                style={{ background: `conic-gradient(${givingStats.conicGradient})` }}
              >
                <div className="w-32 h-32 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                  <span className="text-xs text-stone-400 font-medium uppercase tracking-wider">Total</span>
                  <span className="text-xl font-bold text-stone-900">{givingStats.totalLabel}</span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {givingStats.fundList.map((fund, i) => (
                  <div key={fund.label} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: FUND_COLORS[i % FUND_COLORS.length] }}></div>
                    <span className="text-sm text-stone-600 font-medium">{fund.label} ({fund.percent}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Congregation Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-stone-800 flex items-center gap-2"><Activity size={18} className="text-violet-500"/> Congregation Breakdown</h3>
            <span className="text-xs text-stone-500 font-medium">By Member Type</span>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-4">
            {demographics.map((demo) => (
              <div key={demo.label} className="w-full">
                <div className="flex justify-between text-xs font-semibold text-stone-600 mb-1">
                  <span>{demo.label}</span>
                  <span>{demo.percent}%</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-3">
                  <div className={`${demo.color} h-3 rounded-full transition-all duration-700`} style={{ width: `${demo.percent}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Demographics by member type */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-stone-800 flex items-center gap-2"><Users size={18} className="text-sky-500"/> Congregation Breakdown</h3>
            <span className="text-xs text-stone-500 font-medium">By Member Type</span>
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
        </>
        )}

        {viewMode === 'story' && (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-stone-800 flex items-center gap-2"><PieChart size={18} className="text-teal-500"/> Story Breakdown</h3>
              <span className="text-xs text-stone-500 font-medium">Narrative Cards</span>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Growth Signal</p>
                <p className="mt-1 text-sm font-medium text-emerald-900">
                  {guestSignal
                    ? `${stats.guests} guest${stats.guests !== 1 ? 's' : ''} in your directory — follow up promptly to improve retention.`
                    : 'No first-time guests currently in directory. Promote registration at services.'}
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Watch Area</p>
                <p className="mt-1 text-sm font-medium text-amber-900">
                  {volunteerWatch
                    ? `Volunteer rate is ${stats.volunteerRate}%. Bridge the gap with targeted next-step prompts at check-in.`
                    : `Volunteer and staff engagement is at ${stats.volunteerRate}% — healthy. Keep investing in team culture.`}
                </p>
              </div>
              <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Opportunity</p>
                <p className="mt-1 text-sm font-medium text-sky-900">
                  Your largest segment is {largestDemoLabel}. Launch targeted programming to deepen engagement for this group.
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {demographics.map((demo) => (
                <div key={demo.label} className="rounded-lg bg-stone-50 border border-stone-100 p-3">
                  <p className="text-xs text-stone-500">{demo.label}</p>
                  <div className="mt-2 w-full bg-stone-200 rounded-full h-2">
                    <div className={`${demo.color} h-2 rounded-full`} style={{ width: `${demo.percent}%` }} />
                  </div>
                  <p className="mt-1 text-xs font-semibold text-stone-700">{demo.percent}%</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
