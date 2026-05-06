import { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Download,
  Eye,
  PieChart,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';

export default function ReportingApp({ theme }) {
  const [viewMode, setViewMode] = useState('story');

  const attendanceData = [
    { label: 'Jan 18', value: 45 }, { label: 'Jan 25', value: 55 }, { label: 'Feb 1',  value: 68 },
    { label: 'Feb 8',  value: 62 }, { label: 'Feb 15', value: 85 }, { label: 'Feb 22', value: 95 },
  ];

  const demographics = [
    { label: '0-18 Years',  percent: 25, color: 'bg-sky-500' },
    { label: '19-35 Years', percent: 40, color: 'bg-fuchsia-500' },
    { label: '36-55 Years', percent: 20, color: 'bg-amber-500' },
    { label: '55+ Years',   percent: 15, color: 'bg-emerald-500' },
  ];

  const handleExport = () => {
    const rows = [
      ['Service Date', 'Attendance', 'First-Time Guests', 'Volunteer Rate'],
      ...attendanceData.map(d => [d.label, Math.floor(d.value * 8.42), Math.floor(d.value * 0.5), '38%']),
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

  const attendanceDelta = Math.round(((attendanceData[attendanceData.length - 1].value - attendanceData[0].value) / attendanceData[0].value) * 100);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Insights &amp; Reports</h1>
          <p className="text-stone-500 text-sm mt-1">Cinematic analytics for church health, growth, and engagement trends.</p>
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
              AI Narrative Insight
            </div>
            <h2 className="mt-3 text-xl sm:text-2xl font-bold text-stone-900">
              Attendance momentum is accelerating with a {attendanceDelta}% rise over 6 weeks.
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              Sunday participation is climbing while volunteer involvement trails slightly. Prioritize follow-up with first-time guests and convert momentum into team engagement.
            </p>
          </div>
          <div className="rounded-xl bg-white border border-stone-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Action Focus</p>
            <ul className="mt-3 space-y-2 text-sm text-stone-700">
              <li className="flex items-start gap-2"><Eye size={14} className="mt-0.5 text-teal-600" /> Schedule 2 follow-up touchpoints for guests within 48h.</li>
              <li className="flex items-start gap-2"><Eye size={14} className="mt-0.5 text-teal-600" /> Fill 6 open volunteer slots before next service cycle.</li>
              <li className="flex items-start gap-2"><Eye size={14} className="mt-0.5 text-teal-600" /> Route top 3 giving trends into ministry budget review.</li>
            </ul>
          </div>
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
            <div className="flex items-center gap-1 mt-1 text-emerald-600 text-xs font-semibold"><TrendingUp size={14}/> +12% vs last month</div>
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">Confidence: High</div>
            <p className="mt-2 text-[11px] text-stone-500">Why changed: two outreach Sundays and improved first-visit retention.</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-stone-500">First-Time Guests</span>
            <div className="p-1.5 rounded-md bg-sky-50 text-sky-600"><UserPlus size={16}/></div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold tracking-tight text-stone-900">45</span>
            <div className="flex items-center gap-1 mt-1 text-emerald-600 text-xs font-semibold"><TrendingUp size={14}/> +4% vs last month</div>
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10px] font-bold uppercase tracking-wider">Confidence: Medium</div>
            <p className="mt-2 text-[11px] text-stone-500">Why changed: event campaign uplifted first-time discoverability.</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-stone-500">Volunteer Rate</span>
            <div className="p-1.5 rounded-md bg-amber-50 text-amber-600"><Activity size={16}/></div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold tracking-tight text-stone-900">38%</span>
            <div className="flex items-center gap-1 mt-1 text-rose-600 text-xs font-semibold"><TrendingDown size={14}/> -2% vs last month</div>
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider">Confidence: Medium</div>
            <p className="mt-2 text-[11px] text-stone-500">Why changed: volunteer onboarding lag during growth spike.</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-stone-500">Small Group Growth</span>
            <div className="p-1.5 rounded-md bg-teal-50 text-teal-600"><PieChart size={16}/></div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold tracking-tight text-stone-900">62%</span>
            <div className="flex items-center gap-1 mt-1 text-stone-400 text-xs font-semibold">Unchanged vs last month</div>
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[10px] font-bold uppercase tracking-wider">Confidence: High</div>
            <p className="mt-2 text-[11px] text-stone-500">Why changed: stable participation across existing small groups.</p>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${viewMode === 'story' ? 'xl:grid-cols-[1.4fr_1fr]' : 'lg:grid-cols-2'} gap-6`}>
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-stone-800 flex items-center gap-2"><Activity size={18} className="text-violet-500"/> Engagement Storyline</h3>
            <span className="text-xs text-stone-500 font-medium">Last 6 Services</span>
          </div>
          <div className="relative w-full h-64 bg-stone-50 rounded-xl border border-stone-100 overflow-hidden">
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
            <div className="absolute inset-x-3 bottom-2 grid grid-cols-6 text-[10px] text-stone-500 font-semibold">
              {attendanceData.map((item) => <span key={`x-${item.label}`} className="text-center">{item.label.replace('Jan ', 'J').replace('Feb ', 'F')}</span>)}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-lg bg-stone-50 p-3 border border-stone-100">
              <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Peak</p>
              <p className="text-lg font-bold text-stone-900 mt-1">{Math.max(...attendanceData.map((item) => item.value))}</p>
            </div>
            <div className="rounded-lg bg-stone-50 p-3 border border-stone-100">
              <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Median</p>
              <p className="text-lg font-bold text-stone-900 mt-1">{Math.round(attendanceData.reduce((sum, item) => sum + item.value, 0) / attendanceData.length)}</p>
            </div>
            <div className="rounded-lg bg-stone-50 p-3 border border-stone-100 col-span-2 sm:col-span-1">
              <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Trend</p>
              <p className="text-lg font-bold text-emerald-600 mt-1">+{attendanceDelta}%</p>
            </div>
          </div>
        </div>

        {/* Attendance Growth Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-stone-800 flex items-center gap-2"><BarChart3 size={18} className={theme.color}/> Attendance Growth (6 Wks)</h3>
            <span className="text-xs text-stone-500 font-medium">In-Person Only</span>
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
                    {Math.floor(data.value * 8.42)}
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

        {/* Online vs In-Person Line Chart */}
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

        {/* Demographics */}
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
                <p className="mt-1 text-sm font-medium text-emerald-900">Guest inflow and in-person attendance are both up, signaling strong weekend discoverability.</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Watch Area</p>
                <p className="mt-1 text-sm font-medium text-amber-900">Volunteer rate dipped 2%. Bridge the gap with targeted next-step prompts at check-in.</p>
              </div>
              <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Opportunity</p>
                <p className="mt-1 text-sm font-medium text-sky-900">Young adult segment (19-35) is highest at 40%. Launch community micro-groups to retain momentum.</p>
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
