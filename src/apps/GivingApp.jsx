import { useMemo, useState, useCallback } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Users, CreditCard, Sparkles,
  Loader2, Trash2, Download, Search, Filter, ChevronUp, ChevronDown,
  Award, X,
} from 'lucide-react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import * as XLSX from 'xlsx';
import { callGeminiAI } from '../lib/gemini';
import { createDonation, deleteDonation } from '../lib/firestoreServices';
import { useAuth } from '../hooks/useAuth';

const ANNUAL_GOAL = 150000;

const FUND_COLORS = {
  'General Tithe': '#0d9488',
  'Missions': '#6366f1',
  'Building Fund': '#f59e0b',
};
const FUND_DOT = {
  'General Tithe': 'bg-teal-500',
  'Missions': 'bg-indigo-500',
  'Building Fund': 'bg-amber-500',
};
const TYPE_STYLES = {
  'Zelle': 'bg-purple-100 text-purple-700',
  'Cash/Check': 'bg-stone-100 text-stone-600',
  'Online Card': 'bg-blue-100 text-blue-700',
  'Online Recurring': 'bg-emerald-100 text-emerald-700',
};

const fmt$ = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);
const fmtShort = (n) =>
  (n ?? 0) >= 1000 ? `$${((n ?? 0) / 1000).toFixed(1)}k` : `$${(n ?? 0).toFixed(0)}`;
const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function GivingApp({ theme, donations, setDonations, showToast }) {
  const { user } = useAuth();

  // ── Record form ────────────────────────────────────────────────────────────
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [newDonation, setNewDonation] = useState({
    name: '', amount: '', fund: 'General Tithe', type: 'Zelle',
    date: new Date().toISOString().split('T')[0],
  });

  // ── Filters & sort ─────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterFund, setFilterFund] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  // ── AI ─────────────────────────────────────────────────────────────────────
  const [reportResult, setReportResult] = useState(null);
  const [reportPrompt, setReportPrompt] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // ── Computed ───────────────────────────────────────────────────────────────
  const parsedDonations = useMemo(() => donations.map(d => ({
    ...d,
    amountNum: parseFloat(String(d.amount).replace(/[^0-9.]/g, '')) || 0,
  })), [donations]);

  const ytdTotal      = useMemo(() => parsedDonations.reduce((s, d) => s + d.amountNum, 0), [parsedDonations]);
  const uniqueDonors  = useMemo(() => new Set(parsedDonations.map(d => (d.name || '').toLowerCase().trim()).filter(Boolean)).size, [parsedDonations]);
  const avgGift       = useMemo(() => parsedDonations.length > 0 ? ytdTotal / parsedDonations.length : 0, [ytdTotal, parsedDonations]);
  const largestGift   = useMemo(() => parsedDonations.reduce((max, d) => Math.max(max, d.amountNum), 0), [parsedDonations]);

  // Month-over-month
  const now = new Date();
  const thisMonthKey  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey  = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthTotal = useMemo(() => parsedDonations.filter(d => d.date?.startsWith(thisMonthKey)).reduce((s, d) => s + d.amountNum, 0), [parsedDonations, thisMonthKey]);
  const lastMonthTotal = useMemo(() => parsedDonations.filter(d => d.date?.startsWith(lastMonthKey)).reduce((s, d) => s + d.amountNum, 0), [parsedDonations, lastMonthKey]);
  const monthTrend = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : null;

  // 12-month area chart
  const monthlyChartData = useMemo(() => {
    const months = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      months[key] = { month: label, total: 0 };
    }
    parsedDonations.forEach(d => {
      if (!d.date) return;
      const key = d.date.slice(0, 7);
      if (months[key]) months[key].total += d.amountNum;
    });
    return Object.values(months);
  }, [parsedDonations]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fund donut
  const fundData = useMemo(() => {
    const acc = {};
    parsedDonations.forEach(d => { const f = d.fund || 'Other'; acc[f] = (acc[f] || 0) + d.amountNum; });
    return Object.entries(acc).map(([name, value]) => ({ name, value }));
  }, [parsedDonations]);

  // Payment breakdown
  const typeBreakdown = useMemo(() => {
    const acc = {};
    parsedDonations.forEach(d => { const t = d.type || 'Other'; acc[t] = (acc[t] || 0) + d.amountNum; });
    return Object.entries(acc).sort((a, b) => b[1] - a[1]);
  }, [parsedDonations]);

  // Top 5 contributors
  const topDonors = useMemo(() => {
    const acc = {};
    parsedDonations.forEach(d => {
      const name = (d.name || 'Anonymous').trim();
      if (!acc[name]) acc[name] = { total: 0, count: 0 };
      acc[name].total += d.amountNum;
      acc[name].count += 1;
    });
    return Object.entries(acc).sort((a, b) => b[1].total - a[1].total).slice(0, 5)
      .map(([name, data]) => ({ name, ...data }));
  }, [parsedDonations]);

  // Active filter count
  const activeFilterCount = [filterFund, filterType, filterFrom, filterTo].filter(Boolean).length;

  // Filtered + sorted rows
  const filteredDonations = useMemo(() => {
    let rows = parsedDonations.filter(d => {
      if (search && !(d.name || '').toLowerCase().includes(search.toLowerCase())) return false;
      if (filterFund && d.fund !== filterFund) return false;
      if (filterType && d.type !== filterType) return false;
      if (filterFrom && d.date < filterFrom) return false;
      if (filterTo && d.date > filterTo) return false;
      return true;
    });
    rows = [...rows].sort((a, b) => {
      let av = sortKey === 'amountNum' ? a.amountNum : (a[sortKey] ?? '');
      let bv = sortKey === 'amountNum' ? b.amountNum : (b[sortKey] ?? '');
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [parsedDonations, search, filterFund, filterType, filterFrom, filterTo, sortKey, sortDir]);

  const filteredTotal = useMemo(() => filteredDonations.reduce((s, d) => s + d.amountNum, 0), [filteredDonations]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };
  const SortIcon = ({ col }) => sortKey === col
    ? (sortDir === 'asc' ? <ChevronUp size={12} className="inline ml-1" /> : <ChevronDown size={12} className="inline ml-1" />)
    : <ChevronDown size={12} className="inline ml-1 opacity-25" />;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAddDonation = async () => {
    if (!newDonation.name || !newDonation.amount) return;
    const amountValid = /^\$?\d+(\.\d{1,2})?$/.test(newDonation.amount.trim());
    if (!amountValid) { showToast('Enter a valid amount (e.g. $100 or 100.00)'); return; }

    const tempId = `temp-donation-${Date.now()}`;
    setDonations([{ id: tempId, ...newDonation }, ...donations]);
    setIsAdding(false);
    setNewDonation({ name: '', amount: '', fund: 'General Tithe', type: 'Zelle', date: new Date().toISOString().split('T')[0] });

    try {
      const created = await createDonation(newDonation, user?.email);
      setDonations(prev => prev.map(d => d.id === tempId ? created : d));
      showToast('Donation Recorded Successfully');
    } catch (err) {
      console.error('[GivingApp] Failed to record donation:', err);
      setDonations(prev => prev.filter(d => d.id !== tempId));
      showToast('Failed to record donation');
    }
  };

  const handleDeleteDonation = async (id) => {
    const removed = donations.find(d => d.id === id);
    if (!removed) return;
    setDonations(prev => prev.filter(d => d.id !== id));
    setDeleteConfirmId(null);
    try {
      await deleteDonation(String(id), removed, user?.email);
      showToast('Donation removed');
    } catch (err) {
      console.error('[GivingApp] Failed to delete donation:', err);
      setDonations(prev => [removed, ...prev]);
      showToast('Failed to remove donation');
    }
  };

  const handleGenerateReport = async () => {
    if (!reportPrompt.trim()) return;
    setIsGeneratingReport(true);
    const context = `You are a church financial analyst for Lifegate Assembly of God. Provide a concise, insightful analysis.
Stats: YTD ${fmt$(ytdTotal)}, ${uniqueDonors} unique donors, avg gift ${fmt$(avgGift)}, largest gift ${fmt$(largestGift)}.
This month: ${fmt$(thisMonthTotal)} vs last month: ${fmt$(lastMonthTotal)}.
Funds: ${fundData.map(f => `${f.name}: ${fmt$(f.value)}`).join(', ')}.
Methods: ${typeBreakdown.map(([t, v]) => `${t}: ${fmt$(v)}`).join(', ')}.`;
    const result = await callGeminiAI(reportPrompt, context);
    setReportResult(result);
    setIsGeneratingReport(false);
  };

  // ── Excel Export (Accounting Style) ───────────────────────────────────────
  const handleExport = useCallback(() => {
    const wb = XLSX.utils.book_new();
    const reportDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const period = filterFrom || filterTo
      ? `${filterFrom ? fmtDate(filterFrom) : 'Beginning'} – ${filterTo ? fmtDate(filterTo) : 'Present'}`
      : 'Year to Date';

    const currency = '"$"#,##0.00';
    const percent  = '0.00%';
    const cellFmt  = (ws, row, col, fmt) => {
      const addr = XLSX.utils.encode_cell({ r: row, c: col });
      if (ws[addr]) ws[addr].z = fmt;
    };

    // ── SHEET 1: Summary ────────────────────────────────────────────────────
    const s1 = [
      ['Lifegate Assembly of God Financial Report'],
      [`Generated: ${reportDate}`],
      [`Reporting Period: ${period}`],
      [],
      ['KEY PERFORMANCE INDICATORS', ''],
      ['Metric', 'Amount'],
      ['YTD Total Giving', ytdTotal],
      ['This Month', thisMonthTotal],
      ['Last Month', lastMonthTotal],
      ['Unique Donors', uniqueDonors],
      ['Total Transactions', parsedDonations.length],
      ['Average Gift', avgGift],
      ['Largest Single Gift', largestGift],
      ['Annual Giving Goal', ANNUAL_GOAL],
      ['Goal Progress (%)', ytdTotal / ANNUAL_GOAL],
      [],
      ['GIVING BY FUND', '', ''],
      ['Fund', 'Total', '% of Giving'],
      ...fundData.map(f => [f.name, f.value, ytdTotal > 0 ? f.value / ytdTotal : 0]),
      [],
      ['GIVING BY PAYMENT METHOD', '', ''],
      ['Method', 'Total', '% of Giving'],
      ...typeBreakdown.map(([t, v]) => [t, v, ytdTotal > 0 ? v / ytdTotal : 0]),
      [],
      ['TOP CONTRIBUTORS', '', '', ''],
      ['Donor', 'Total Given', 'Gift Count', 'Average Gift'],
      ...topDonors.map(d => [d.name, d.total, d.count, d.count > 0 ? d.total / d.count : 0]),
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(s1);
    ws1['!cols'] = [{ wch: 34 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
    ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
    [6, 7, 8, 11, 12, 13].forEach(r => cellFmt(ws1, r, 1, currency));
    cellFmt(ws1, 14, 1, percent);
    const fundStart = 17;
    fundData.forEach((_, i) => { cellFmt(ws1, fundStart + i, 1, currency); cellFmt(ws1, fundStart + i, 2, percent); });
    const typeStart = fundStart + fundData.length + 2;
    typeBreakdown.forEach((_, i) => { cellFmt(ws1, typeStart + i, 1, currency); cellFmt(ws1, typeStart + i, 2, percent); });
    const topStart = typeStart + typeBreakdown.length + 2;
    topDonors.forEach((_, i) => { cellFmt(ws1, topStart + i, 1, currency); cellFmt(ws1, topStart + i, 3, currency); });
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

    // ── SHEET 2: Monthly Trend ──────────────────────────────────────────────
    const s2 = [
      ['Lifegate Assembly of God Financial Report'],
      [`Generated: ${reportDate}  |  Period: ${period}`],
      [],
      ['MONTHLY GIVING TREND'],
      ['Month', 'Total Giving'],
      ...monthlyChartData.map(m => [m.month, m.total]),
      [],
      ['TOTAL', monthlyChartData.reduce((s, m) => s + m.total, 0)],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(s2);
    ws2['!cols'] = [{ wch: 16 }, { wch: 18 }];
    ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    monthlyChartData.forEach((_, i) => cellFmt(ws2, 4 + i, 1, currency));
    cellFmt(ws2, 4 + monthlyChartData.length + 1, 1, currency);
    XLSX.utils.book_append_sheet(wb, ws2, 'Monthly Trend');

    // ── SHEET 3: Transaction Ledger ─────────────────────────────────────────
    const filtersNote = activeFilterCount > 0
      ? `Fund: "${filterFund || 'All'}"  Method: "${filterType || 'All'}"  From: "${filterFrom || 'Any'}"  To: "${filterTo || 'Any'}"`
      : 'None';
    const s3 = [
      ['Lifegate Assembly of God Financial Report'],
      [`Generated: ${reportDate}`],
      [`Period: ${period}`],
      [`Filters Applied: ${filtersNote}`],
      [],
      ['#', 'Date', 'Donor Name', 'Fund', 'Payment Method', 'Amount'],
      ...filteredDonations.map((d, i) => [
        i + 1,
        d.date,
        d.name || 'Anonymous',
        d.fund || '',
        d.type || '',
        d.amountNum,
      ]),
      [],
      ['', '', '', '', 'SUBTOTAL', filteredTotal],
      ['', '', '', '', 'RECORDS',  filteredDonations.length],
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(s3);
    ws3['!cols'] = [{ wch: 5 }, { wch: 14 }, { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 16 }];
    ws3['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
    const txStart = 5;
    filteredDonations.forEach((_, i) => cellFmt(ws3, txStart + i, 5, currency));
    cellFmt(ws3, txStart + filteredDonations.length + 1, 5, currency);
    XLSX.utils.book_append_sheet(wb, ws3, 'Transaction Ledger');

    XLSX.writeFile(wb, `Lifegate-Financial-Report-${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Financial report exported');
  }, [
    filteredDonations, filteredTotal, parsedDonations, ytdTotal, thisMonthTotal, lastMonthTotal,
    uniqueDonors, avgGift, largestGift, fundData, typeBreakdown, topDonors, monthlyChartData,
    filterFund, filterType, filterFrom, filterTo, activeFilterCount,
  ]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const goalPct = Math.min((ytdTotal / ANNUAL_GOAL) * 100, 100);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">

      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Financial Analytics &amp; Giving</h1>
          <p className="text-stone-500 text-sm mt-1">Track donations, reconcile Zelle, and export accounting reports.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleExport} className="px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-md text-sm font-medium shadow-sm hover:bg-stone-50 flex items-center gap-2">
            <Download size={15} /> Export Report
          </button>
          <button onClick={() => setIsAdding(true)} className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}>
            <DollarSign size={15} /> Record Gift
          </button>
        </div>
      </div>

      {/* Record Gift Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
              <DollarSign className="text-teal-600" /> Record New Gift
            </h2>
            <div className="space-y-4">
              <input type="text" placeholder="Donor Name" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-teal-500" value={newDonation.name} onChange={e => setNewDonation({ ...newDonation, name: e.target.value })} />
              <input type="text" placeholder="Amount (e.g. $100.00)" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-teal-500" value={newDonation.amount} onChange={e => setNewDonation({ ...newDonation, amount: e.target.value })} />
              <input type="date" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-teal-500 text-sm text-stone-600" value={newDonation.date} onChange={e => setNewDonation({ ...newDonation, date: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <select className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-teal-500 text-sm" value={newDonation.fund} onChange={e => setNewDonation({ ...newDonation, fund: e.target.value })}>
                  <option>General Tithe</option><option>Missions</option><option>Building Fund</option>
                </select>
                <select className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-teal-500 text-sm" value={newDonation.type} onChange={e => setNewDonation({ ...newDonation, type: e.target.value })}>
                  <option>Zelle</option><option>Cash/Check</option><option>Online Card</option><option>Online Recurring</option>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* YTD + Goal Progress */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-stone-500">YTD Total Giving</p>
            <div className={`p-2 rounded-lg ${theme.light} ${theme.color}`}><TrendingUp size={15} /></div>
          </div>
          <h3 className="text-3xl font-bold text-stone-900 tracking-tight tabular-nums">{fmt$(ytdTotal)}</h3>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-stone-400 mb-1">
              <span>Annual Goal</span><span>{fmt$(ANNUAL_GOAL)}</span>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${theme.bg} transition-all`} style={{ width: `${goalPct}%` }} />
            </div>
            <p className="text-xs text-stone-400 mt-1">{goalPct.toFixed(1)}% of annual goal</p>
          </div>
        </div>

        {/* This Month */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-stone-500">This Month</p>
            {monthTrend !== null && (
              monthTrend >= 0
                ? <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5"><TrendingUp size={11} />+{monthTrend.toFixed(0)}%</span>
                : <span className="text-xs font-bold text-rose-500 flex items-center gap-0.5"><TrendingDown size={11} />{monthTrend.toFixed(0)}%</span>
            )}
          </div>
          <h3 className="text-xl font-bold text-stone-900 tabular-nums">{fmtShort(thisMonthTotal)}</h3>
          <p className="text-xs text-stone-400 mt-1">vs {fmtShort(lastMonthTotal)} last mo.</p>
        </div>

        {/* Unique Donors */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-stone-500">Unique Donors</p>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600"><Users size={15} /></div>
          </div>
          <h3 className="text-xl font-bold text-stone-900">{uniqueDonors}</h3>
          <p className="text-xs text-stone-400 mt-1">{parsedDonations.length} transactions</p>
        </div>

        {/* Avg / Largest */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-stone-500">Avg Gift</p>
            <div className="p-2 rounded-lg bg-orange-50 text-orange-500"><CreditCard size={15} /></div>
          </div>
          <h3 className="text-xl font-bold text-stone-900 tabular-nums">{fmtShort(avgGift)}</h3>
          <p className="text-xs text-stone-400 mt-1">Largest: {fmtShort(largestGift)}</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* 12-Month Area Chart */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-stone-200 p-5">
          <h3 className="font-semibold text-stone-800 text-sm mb-4">12-Month Giving Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={monthlyChartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0d9488" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => [fmt$(v), 'Giving']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e7e5e4' }} />
              <Area type="monotone" dataKey="total" stroke="#0d9488" strokeWidth={2} fill="url(#gGrad)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Fund Donut */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5">
          <h3 className="font-semibold text-stone-800 text-sm mb-3">Fund Allocation</h3>
          {fundData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={fundData} cx="50%" cy="50%" innerRadius={44} outerRadius={65} paddingAngle={3} dataKey="value">
                    {fundData.map(entry => (
                      <Cell key={entry.name} fill={FUND_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={v => [fmt$(v)]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-1">
                {fundData.map(f => (
                  <div key={f.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-stone-600">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${FUND_DOT[f.name] || 'bg-slate-400'}`} />
                      {f.name}
                    </span>
                    <span className="font-semibold text-stone-800">{ytdTotal > 0 ? `${((f.value / ytdTotal) * 100).toFixed(0)}%` : '—'}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-xs text-stone-400">No data yet.</p>}
        </div>
      </div>

      {/* Breakdown Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5">
          <h3 className="font-semibold text-stone-800 text-sm mb-4">Payment Methods</h3>
          <div className="space-y-3">
            {typeBreakdown.map(([type, amt]) => (
              <div key={type}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px] ${TYPE_STYLES[type] || 'bg-stone-100 text-stone-600'}`}>{type}</span>
                  <span className="font-semibold text-stone-700 tabular-nums">{fmt$(amt)}</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${theme.bg} transition-all`} style={{ width: `${ytdTotal > 0 ? (amt / ytdTotal) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
            {typeBreakdown.length === 0 && <p className="text-xs text-stone-400">No data yet.</p>}
          </div>
        </div>

        {/* Top Contributors */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5">
          <h3 className="font-semibold text-stone-800 text-sm mb-4 flex items-center gap-2">
            <Award size={15} className="text-amber-500" /> Top Contributors
          </h3>
          <div className="space-y-3">
            {topDonors.map((donor, i) => (
              <div key={donor.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
                    ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-stone-100 text-stone-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-stone-50 text-stone-400'}`}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-stone-800">{donor.name}</p>
                    <p className="text-[10px] text-stone-400">{donor.count} gift{donor.count !== 1 ? 's' : ''} · avg {fmtShort(donor.count > 0 ? donor.total / donor.count : 0)}</p>
                  </div>
                </div>
                <span className="font-bold text-sm text-teal-700 tabular-nums">{fmt$(donor.total)}</span>
              </div>
            ))}
            {topDonors.length === 0 && <p className="text-xs text-stone-400">No data yet.</p>}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        {/* Controls bar */}
        <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex flex-wrap items-center gap-3 justify-between">
          <h3 className="font-semibold text-stone-800">Transaction Ledger</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input type="text" placeholder="Search donor…" className="pl-7 pr-3 py-1.5 border border-stone-200 rounded-md text-xs outline-none focus:border-teal-500 w-40 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button onClick={() => setShowFilters(v => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-xs font-medium transition-colors ${showFilters ? `${theme.bg} text-white border-transparent` : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>
              <Filter size={12} /> Filters
              {activeFilterCount > 0 && <span className="w-4 h-4 bg-white text-teal-700 rounded-full text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>}
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="px-5 py-3 bg-stone-50 border-b border-stone-100 flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block mb-1">Fund</label>
              <select className="p-1.5 border border-stone-200 rounded text-xs outline-none focus:border-teal-500 bg-white" value={filterFund} onChange={e => setFilterFund(e.target.value)}>
                <option value="">All Funds</option><option>General Tithe</option><option>Missions</option><option>Building Fund</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block mb-1">Method</label>
              <select className="p-1.5 border border-stone-200 rounded text-xs outline-none focus:border-teal-500 bg-white" value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="">All Methods</option><option>Zelle</option><option>Cash/Check</option><option>Online Card</option><option>Online Recurring</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block mb-1">From</label>
              <input type="date" className="p-1.5 border border-stone-200 rounded text-xs outline-none focus:border-teal-500 bg-white" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block mb-1">To</label>
              <input type="date" className="p-1.5 border border-stone-200 rounded text-xs outline-none focus:border-teal-500 bg-white" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
            </div>
            {activeFilterCount > 0 && (
              <button onClick={() => { setFilterFund(''); setFilterType(''); setFilterFrom(''); setFilterTo(''); }} className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 pb-1.5">
                <X size={12} /> Clear all
              </button>
            )}
          </div>
        )}

        <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-stone-100 text-stone-500 font-medium sticky top-0 bg-white z-10 text-xs">
              <tr>
                <th className="px-5 py-3 cursor-pointer select-none hover:text-stone-800" onClick={() => handleSort('name')}>
                  Donor <SortIcon col="name" />
                </th>
                <th className="px-5 py-3 cursor-pointer select-none hover:text-stone-800" onClick={() => handleSort('amountNum')}>
                  Amount <SortIcon col="amountNum" />
                </th>
                <th className="px-5 py-3">Fund</th>
                <th className="px-5 py-3">Method</th>
                <th className="px-5 py-3 cursor-pointer select-none hover:text-stone-800" onClick={() => handleSort('date')}>
                  Date <SortIcon col="date" />
                </th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredDonations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-stone-400 text-sm">No transactions match your filters.</td>
                </tr>
              )}
              {filteredDonations.map(d => (
                <tr key={d.id} className="hover:bg-stone-50">
                  <td className="px-5 py-3.5 font-medium text-stone-900">{d.name || 'Anonymous'}</td>
                  <td className="px-5 py-3.5 font-semibold text-teal-700 tabular-nums">{fmt$(d.amountNum)}</td>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-1.5 text-stone-500 text-xs">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${FUND_DOT[d.fund] || 'bg-slate-300'}`} />
                      {d.fund}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${TYPE_STYLES[d.type] || 'bg-stone-100 text-stone-600'}`}>
                      {d.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-stone-500 text-xs">{fmtDate(d.date)}</td>
                  <td className="px-5 py-3.5 text-right">
                    {deleteConfirmId === d.id ? (
                      <span className="inline-flex items-center gap-2">
                        <button onClick={() => handleDeleteDonation(d.id)} className="text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 px-2 py-1 rounded">Confirm</button>
                        <button onClick={() => setDeleteConfirmId(null)} className="text-xs text-stone-500 hover:text-stone-700">Cancel</button>
                      </span>
                    ) : (
                      <button onClick={() => setDeleteConfirmId(d.id)} className="text-xs font-semibold text-rose-500 hover:text-rose-700 inline-flex items-center gap-1">
                        <Trash2 size={12} /> Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {filteredDonations.length > 0 && (
              <tfoot className="border-t-2 border-stone-200 bg-stone-50 sticky bottom-0">
                <tr>
                  <td className="px-5 py-3 text-xs font-semibold text-stone-500">
                    {filteredDonations.length} record{filteredDonations.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-5 py-3 font-bold text-teal-700 tabular-nums">{fmt$(filteredTotal)}</td>
                  <td colSpan={4} className="px-5 py-3 text-xs text-stone-400 text-right">
                    {activeFilterCount > 0 || search ? 'Filtered total' : 'Grand total'}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* AI Financial Analyst */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className={`${theme.bg} px-5 py-4 text-white flex justify-between items-center`}>
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-white/80" />
            <h3 className="font-semibold">AI Financial Analyst</h3>
          </div>
          <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded uppercase tracking-wider">Gemini</span>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-2 mb-4">
            {["Summarize this month's giving", "Which fund is growing fastest?", "How is donor retention trending?", "Are there any unusual patterns?"].map(chip => (
              <button key={chip} onClick={() => setReportPrompt(chip)}
                className="text-xs px-3 py-1.5 rounded-full border border-stone-200 text-stone-600 hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50 transition-colors">
                {chip}
              </button>
            ))}
          </div>
          <div className="flex gap-3 items-start">
            <textarea
              className="flex-1 p-3 border border-stone-200 rounded-lg text-sm focus:ring-1 focus:ring-teal-500 outline-none resize-none bg-stone-50"
              placeholder="Ask about giving trends, donor patterns, budget forecasts…"
              rows="3"
              value={reportPrompt}
              onChange={e => setReportPrompt(e.target.value)}
            />
            <button
              onClick={handleGenerateReport}
              disabled={isGeneratingReport || !reportPrompt.trim()}
              className={`px-4 py-3 ${theme.bg} text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 flex-shrink-0`}
            >
              {isGeneratingReport ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={14} />}
              {isGeneratingReport ? 'Analyzing…' : 'Analyze'}
            </button>
          </div>
          {reportResult && (
            <div className="mt-4 p-4 bg-stone-50 border border-stone-100 rounded-lg text-xs text-stone-700 whitespace-pre-wrap leading-relaxed">
              {reportResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
