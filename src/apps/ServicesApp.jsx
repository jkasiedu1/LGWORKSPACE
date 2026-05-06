import { useEffect, useState } from 'react';
import { Sparkles, Loader2, GripVertical, AlertCircle, Plus, Save, Edit2, Clock, Users } from 'lucide-react';
import { callGeminiAI } from '../lib/gemini';
import { saveServicePlan } from '../lib/firestoreServices';

export default function ServicesApp({ theme, planItems, setPlanItems, servicePlan, setServicePlan, isAdmin, showToast }) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ time: '', length: '', title: '', type: 'Element', person: '' });
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerData, setHeaderData] = useState({ title: 'Ash Wednesday Gathering', date: '2026-02-18', time: '19:00', location: 'Main Auditorium' });
  const [activeTab, setActiveTab] = useState('order');
  const [serviceTimes, setServiceTimes] = useState([
    { id: 1, label: '1st Service', time: '8:00 AM', location: 'Main Auditorium', volunteers: 12 },
    { id: 2, label: '2nd Service', time: '10:30 AM', location: 'Main Auditorium', volunteers: 20 },
    { id: 3, label: 'Online Stream', time: '10:30 AM', location: 'YouTube / Church Online', volunteers: 4 },
  ]);
  const [newServiceTime, setNewServiceTime] = useState({ label: '', time: '', location: '' });

  useEffect(() => {
    if (servicePlan?.headerData) {
      setHeaderData(servicePlan.headerData);
    }
    if (servicePlan?.serviceTimes) {
      setServiceTimes(servicePlan.serviceTimes);
    }
  }, [servicePlan]);

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

  const handleSavePlan = async () => {
    const payload = { headerData, serviceTimes };
    try {
      await saveServicePlan(payload);
      setServicePlan(payload);
      showToast('Service Plan Saved Successfully!');
    } catch (error) {
      console.error('[ServicesApp] Failed to save service plan:', error);
      showToast('Failed to save plan');
    }
  };

  const handleAddServiceTime = async () => {
    if (!newServiceTime.label || !newServiceTime.time) return;
    const updatedServiceTimes = [
      ...serviceTimes,
      {
        id: Date.now(),
        label: newServiceTime.label,
        time: newServiceTime.time,
        location: newServiceTime.location || 'Main Auditorium',
        volunteers: 0,
      },
    ];
    setServiceTimes(updatedServiceTimes);
    setNewServiceTime({ label: '', time: '', location: '' });

    try {
      const payload = { headerData, serviceTimes: updatedServiceTimes };
      await saveServicePlan(payload);
      setServicePlan(payload);
    } catch (error) {
      console.error('[ServicesApp] Failed to persist service time:', error);
    }
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
          <button onClick={() => window.print()} className="px-4 py-2 bg-white border border-stone-200 rounded-md text-sm font-medium text-stone-700 hover:bg-stone-50 shadow-sm">Print</button>
          {isAdmin && <button onClick={handleSavePlan} className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90`}>Save Plan</button>}
        </div>
      </div>

      <div className="border-b border-stone-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button onClick={() => setActiveTab('order')} className={`border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'order' ? `${theme.border} ${theme.color}` : 'border-transparent text-stone-500 hover:text-stone-700'}`}>Order</button>
          <button onClick={() => setActiveTab('teams')} className={`border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'teams' ? `${theme.border} ${theme.color}` : 'border-transparent text-stone-500 hover:text-stone-700'}`}>Teams</button>
          <button onClick={() => setActiveTab('times')} className={`border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'times' ? `${theme.border} ${theme.color}` : 'border-transparent text-stone-500 hover:text-stone-700'}`}>Times</button>
        </nav>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {activeTab === 'order' && (<>
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
                    <td className="px-4 py-3 text-stone-300">{isAdmin && <GripVertical size={16} className="cursor-move group-hover:text-stone-500" />}</td>
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
                      {isAdmin && <button onClick={() => setPlanItems(planItems.filter(i => i.id !== item.id))} className="text-stone-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><AlertCircle size={16}/></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isAdmin && (
            isAdding ? (
              <div className="p-4 border-t border-stone-100 bg-stone-50">
                <div className="grid grid-cols-5 gap-2 mb-3">
                  <input type="text" placeholder="Time"   className="p-2 text-sm border border-stone-200 rounded outline-none focus:border-amber-500" value={newItem.time}   onChange={e => setNewItem({...newItem, time: e.target.value})} />
                  <input type="text" placeholder="Length" className="p-2 text-sm border border-stone-200 rounded outline-none focus:border-amber-500" value={newItem.length} onChange={e => setNewItem({...newItem, length: e.target.value})} />
                  <input type="text" placeholder="Title"  className="p-2 text-sm border border-stone-200 rounded outline-none focus:border-amber-500" value={newItem.title}  onChange={e => setNewItem({...newItem, title: e.target.value})} />
                  <select className="p-2 text-sm border border-stone-200 rounded outline-none focus:border-amber-500" value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value})}>
                    <option value="Element">Element</option>
                    <option value="Song">Song</option>
                    <option value="Sermon">Sermon</option>
                  </select>
                  <input type="text" placeholder="Person" className="p-2 text-sm border border-stone-200 rounded outline-none focus:border-amber-500" value={newItem.person} onChange={e => setNewItem({...newItem, person: e.target.value})} />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-200 rounded">Cancel</button>
                  <button onClick={() => { if(newItem.title) { setPlanItems([...planItems, { id: Date.now(), ...newItem }]); setIsAdding(false); setNewItem({ time: '', length: '', title: '', type: 'Element', person: '' }); } }} className={`px-3 py-1.5 text-sm text-white ${theme.bg} rounded hover:opacity-90`}>Save Item</button>
                </div>
              </div>
            ) : (
              <div className="p-4 border-t border-stone-100 bg-stone-50">
                <button onClick={() => setIsAdding(true)} className="text-sm font-medium text-stone-600 hover:text-stone-900 flex items-center gap-1"><Plus size={16}/> Add Item</button>
              </div>
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
              {result && <div className="mt-2 p-4 bg-stone-50 border border-stone-100 rounded-lg text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{result}</div>}
            </div>
          </div>
        )}
        </>)}

        {activeTab === 'teams' && (
          <div className="xl:col-span-3 bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
              <h3 className="font-semibold text-stone-800 flex items-center gap-2"><Users size={16}/> Service Team Assignments</h3>
            </div>
            <div className="divide-y divide-stone-100">
              {[
                { role: 'Worship Leader', person: 'James Asiedu', status: 'Confirmed' },
                { role: 'Drummer', person: 'Marcus Johnson', status: 'Confirmed' },
                { role: 'Keys', person: 'Priya Nair', status: 'Pending' },
                { role: 'Bassist', person: 'Tom Eriksen', status: 'Confirmed' },
                { role: 'Vocals', person: 'Abena Mensah', status: 'Confirmed' },
                { role: 'Sermon', person: 'Pastor David Chen', status: 'Confirmed' },
                { role: 'Production / Stream', person: 'Sam Rivera', status: 'Pending' },
              ].map((row, i) => (
                <div key={i} className="px-5 py-4 flex items-center justify-between hover:bg-stone-50">
                  <div>
                    <p className="font-medium text-stone-900 text-sm">{row.role}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{row.person}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${row.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{row.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'times' && (
          <div className="xl:col-span-3 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {serviceTimes.map(st => (
                <div key={st.id} className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${theme.light} ${theme.color}`}><Clock size={18}/></div>
                    <h3 className="font-bold text-stone-900">{st.label}</h3>
                  </div>
                  <p className="text-2xl font-bold text-stone-900">{st.time}</p>
                  <p className="text-xs text-stone-500 mt-1">{st.location}</p>
                  <p className="text-xs text-stone-500 mt-2">{st.volunteers} volunteers scheduled</p>
                </div>
              ))}
            </div>
            {isAdmin && (
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
                <h3 className="font-semibold text-stone-800 mb-4">Add Service Time</h3>
                <div className="grid grid-cols-3 gap-3">
                  <input type="text" placeholder="Label (e.g. 3rd Service)" className="p-2 border border-stone-200 rounded-md text-sm outline-none focus:border-amber-500" value={newServiceTime.label} onChange={e => setNewServiceTime(prev => ({ ...prev, label: e.target.value }))} />
                  <input type="text" placeholder="Time (e.g. 1:00 PM)" className="p-2 border border-stone-200 rounded-md text-sm outline-none focus:border-amber-500" value={newServiceTime.time} onChange={e => setNewServiceTime(prev => ({ ...prev, time: e.target.value }))} />
                  <input type="text" placeholder="Location" className="p-2 border border-stone-200 rounded-md text-sm outline-none focus:border-amber-500" value={newServiceTime.location} onChange={e => setNewServiceTime(prev => ({ ...prev, location: e.target.value }))} />
                </div>
                <button onClick={handleAddServiceTime} className={`mt-3 px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium hover:opacity-90`}>Add Time</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
