import { useState } from 'react';
import { DollarSign, TrendingUp, Users, CreditCard, Sparkles, Loader2 } from 'lucide-react';
import { callGeminiAI } from '../lib/gemini';
import { createDonation, deleteDonation } from '../lib/firestoreServices';

export default function GivingApp({ theme, donations, setDonations, showToast }) {
  const [reportResult, setReportResult] = useState(null);
  const [reportPrompt, setReportPrompt] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newDonation, setNewDonation] = useState({ name: '', amount: '', fund: 'General Tithe', type: 'Zelle', date: new Date().toISOString().split('T')[0] });

  const handleAddDonation = async () => {
    if (!newDonation.name || !newDonation.amount) return;

    const tempId = `temp-donation-${Date.now()}`;
    const optimisticDonation = { id: tempId, ...newDonation };
    setDonations([optimisticDonation, ...donations]);
    setIsAdding(false);
    setNewDonation({ name: '', amount: '', fund: 'General Tithe', type: 'Zelle', date: new Date().toISOString().split('T')[0] });

    try {
      const created = await createDonation(newDonation);
      setDonations((prev) => prev.map((donation) => (donation.id === tempId ? created : donation)));
      showToast('Donation Recorded Successfully');
    } catch (error) {
      console.error('[GivingApp] Failed to record donation:', error);
      setDonations((prev) => prev.filter((donation) => donation.id !== tempId));
      showToast('Failed to record donation');
    }
  };

  const handleDeleteDonation = async (donationId) => {
    const removedDonation = donations.find((donation) => donation.id === donationId);
    if (!removedDonation) return;

    setDonations((prev) => prev.filter((donation) => donation.id !== donationId));
    try {
      await deleteDonation(String(donationId));
      showToast('Donation removed');
    } catch (error) {
      console.error('[GivingApp] Failed to delete donation:', error);
      setDonations((prev) => [removedDonation, ...prev]);
      showToast('Failed to remove donation');
    }
  };

  const handleGenerateReport = async () => {
    if (!reportPrompt.trim()) return;
    setIsGeneratingReport(true);
    const context = `You are a church financial analyst. The user is asking about giving trends and donation data. Provide a concise, insightful analysis. Current stats: YTD giving $142,500, 184 recurring donors, average gift $185. Donation types include Zelle, Cash/Check, and Online Card.`;
    const result = await callGeminiAI(reportPrompt, context);
    setReportResult(result);
    setIsGeneratingReport(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Financial Analytics &amp; Giving</h1>
          <p className="text-stone-500 text-sm mt-1">Track donations, Zelle reconciliation, and generate insights.</p>
        </div>
        <button onClick={() => setIsAdding(true)} className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}>
          <DollarSign size={16}/> Record Gift / Zelle Sync
        </button>
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
          <div className="px-5 py-4 border-b border-stone-200 bg-stone-50"><h3 className="font-semibold text-stone-800">Recent Transactions</h3></div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-stone-100 text-stone-500 font-medium sticky top-0 bg-white z-10">
                <tr>
                  <th className="px-5 py-3">Donor</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Fund</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {donations.map((donation) => (
                  <tr key={donation.id} className="hover:bg-stone-50">
                    <td className="px-5 py-4 font-medium text-stone-900">{donation.name}</td>
                    <td className="px-5 py-4 font-semibold text-teal-600">{donation.amount}</td>
                    <td className="px-5 py-4 text-stone-500">{donation.fund}</td>
                    <td className="px-5 py-4"><span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${donation.type === 'Zelle' ? 'bg-purple-100 text-purple-700' : 'bg-stone-100 text-stone-600'}`}>{donation.type}</span></td>
                    <td className="px-5 py-4 text-stone-500">{donation.date}</td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => handleDeleteDonation(donation.id)} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden h-fit">
          <div className={`${theme.bg} p-4 text-white flex justify-between items-center`}>
            <div className="flex items-center gap-2"><Sparkles size={18} className="text-white/80" /><h3 className="font-semibold">AI Data Analyst</h3></div>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded uppercase tracking-wider">Gemini</span>
          </div>
          <div className="p-4 flex flex-col gap-4">
            <p className="text-xs text-stone-500">Ask Gemini to analyze giving trends, forecast budgets, or reconcile your Zelle transaction logs.</p>
            <textarea className="w-full p-3 border border-stone-200 rounded-lg text-sm focus:ring-1 focus:ring-teal-500 outline-none resize-none bg-stone-50" placeholder="e.g., Match the uploaded Zelle CSV with our internal donor records..." rows="3" value={reportPrompt} onChange={e => setReportPrompt(e.target.value)}></textarea>
            <button onClick={handleGenerateReport} disabled={isGeneratingReport || !reportPrompt.trim()} className={`w-full py-2.5 ${theme.bg} text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity flex justify-center items-center gap-2 disabled:opacity-50`}>
              {isGeneratingReport ? <Loader2 size={16} className="animate-spin"/> : <><Sparkles size={14}/> Generate Report</>}
            </button>
            {reportResult && (
              <div className="mt-2 p-4 bg-stone-50 border border-stone-100 rounded-lg text-xs text-stone-700 whitespace-pre-wrap leading-relaxed">
                {reportResult}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
