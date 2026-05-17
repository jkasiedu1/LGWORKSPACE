import { useEffect, useState } from 'react';
import { Sparkles, Loader2, GripVertical, Plus, Save, Clock, Users, Trash2 } from 'lucide-react';
import MarkdownRenderer from '../components/MarkdownRenderer.jsx';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { callAI } from '../lib/gemini';
import { saveServicePlan } from '../lib/firestoreServices';

const PLAN_ITEM_TYPES = ['Element', 'Song', 'Sermon', 'Prayer', 'Announcement', 'Offering'];

function SortablePlanRow({ item, theme, isAdmin, onDelete, onUpdate }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const cell = 'p-1 text-sm border border-transparent rounded outline-none focus:border-amber-400 focus:bg-amber-50 bg-transparent w-full';
  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-stone-50 group">
      <td className="px-2 py-2 text-stone-300">
        {isAdmin && (
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none focus:outline-none">
            <GripVertical size={16} className="group-hover:text-stone-500" />
          </button>
        )}
      </td>
      <td className="px-2 py-2">
        {isAdmin
          ? <input className={cell} value={item.time} onChange={e => onUpdate(item.id, 'time', e.target.value)} placeholder="Time" />
          : <span className="font-medium text-stone-900">{item.time}</span>}
      </td>
      <td className="px-2 py-2">
        {isAdmin
          ? <input className={cell} value={item.length} onChange={e => onUpdate(item.id, 'length', e.target.value)} placeholder="5 min" />
          : <span className="text-stone-500">{item.length}</span>}
      </td>
      <td className="px-2 py-2 w-32">
        {isAdmin
          ? <select className="text-xs border border-transparent rounded bg-transparent outline-none focus:border-amber-400 focus:bg-amber-50 text-stone-500 py-1 w-full" value={item.type} onChange={e => onUpdate(item.id, 'type', e.target.value)}>
              {PLAN_ITEM_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          : <span className="text-xs text-stone-500">{item.type}</span>}
      </td>
      <td className="px-2 py-2">
        {isAdmin
          ? <input className={`${cell} font-medium`} value={item.title} onChange={e => onUpdate(item.id, 'title', e.target.value)} placeholder="Title" />
          : <div className="flex items-center gap-2">
              {item.type === 'Song' && <span className={`w-2 h-2 rounded-full ${theme.bg}`} />}
              <span className="font-medium text-stone-900">{item.title}</span>
            </div>}
      </td>
      <td className="px-2 py-2">
        {isAdmin
          ? <input className={cell} value={item.person} onChange={e => onUpdate(item.id, 'person', e.target.value)} placeholder="Person" />
          : <span className="text-stone-500">{item.person}</span>}
      </td>
      <td className="px-2 py-2 text-right">
        {isAdmin && (
          <button onClick={() => onDelete(item.id)} className="opacity-0 group-hover:opacity-100 p-1 text-rose-400 hover:text-rose-600 transition-all rounded">
            <Trash2 size={14} />
          </button>
        )}
      </td>
    </tr>
  );
}

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
  const [serviceTeamAssignments, setServiceTeamAssignments] = useState([
    { id: 1, role: 'Worship Leader', person: 'James Asiedu', status: 'Confirmed' },
    { id: 2, role: 'Drummer', person: 'Marcus Johnson', status: 'Confirmed' },
    { id: 3, role: 'Keys', person: 'Priya Nair', status: 'Pending' },
    { id: 4, role: 'Bassist', person: 'Tom Eriksen', status: 'Confirmed' },
    { id: 5, role: 'Vocals', person: 'Abena Mensah', status: 'Confirmed' },
    { id: 6, role: 'Sermon', person: 'Pastor David Chen', status: 'Confirmed' },
    { id: 7, role: 'Production / Stream', person: 'Sam Rivera', status: 'Pending' },
  ]);

  const dndSensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    if (servicePlan?.headerData) {
      setHeaderData(servicePlan.headerData);
    }
    if (servicePlan?.serviceTimes) {
      setServiceTimes(servicePlan.serviceTimes);
    }
    if (servicePlan?.planItems) {
      setPlanItems(servicePlan.planItems);
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
    const context = `You are a pastoral assistant helping plan a church service. Give a brief, insightful, 3-point teaching outline or service element note based on this prompt: "${prompt}". Keep it short and highly actionable. Format your response with markdown: use ## for main headers, ### for sub-headers, **bold** for key terms, and numbered lists (1. 2. 3.) or bullet points (- ) for outlines.`;
    const responseText = await callAI(prompt, context);
    setResult(responseText);
    setIsGenerating(false);
  };

  const handleSavePlan = async () => {
    const payload = { headerData, serviceTimes, planItems };
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
            <div className="flex items-start gap-3">
              <div>
                <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">{headerData.title}</h1>
                <p className="text-stone-500 text-sm mt-1">{displayDate} • {displayTime} • {headerData.location}</p>
              </div>
              {isAdmin && (
                <button onClick={() => setIsEditingHeader(true)} className="mt-1 px-2.5 py-1 text-xs font-semibold rounded-md text-amber-700 bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors" title="Edit Service Details">
                  Edit Details
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

      <div className="space-y-6">
        {activeTab === 'order' && (<>
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <DndContext
            sensors={dndSensors}
            collisionDetection={closestCenter}
            onDragEnd={({ active, over }) => {
              if (!over || active.id === over.id) return;
              const oldIndex = planItems.findIndex(i => i.id === active.id);
              const newIndex = planItems.findIndex(i => i.id === over.id);
              setPlanItems(arrayMove(planItems, oldIndex, newIndex));
            }}
          >
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-medium">
                <tr>
                  <th className="px-4 py-3 w-8"></th>
                  <th className="px-4 py-3 w-24">Time</th>
                  <th className="px-4 py-3 w-20">Length</th>
                  <th className="px-4 py-3 w-32">Type</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3 w-36">Person</th>
                  <th className="px-4 py-3 w-8"></th>
                </tr>
              </thead>
                <SortableContext items={planItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  <tbody className="divide-y divide-stone-100">
                    {planItems.map((item) => (
                      <SortablePlanRow
                        key={item.id}
                        item={item}
                        theme={theme}
                        isAdmin={isAdmin}
                        onDelete={(id) => setPlanItems(planItems.filter(i => i.id !== id))}
                        onUpdate={(id, field, val) => setPlanItems(prev => prev.map(i => i.id === id ? { ...i, [field]: val } : i))}
                      />
                    ))}
                  </tbody>
                </SortableContext>
            </table>
          </div>
          </DndContext>
          {isAdmin && (
            isAdding ? (
              <div className="p-4 border-t border-stone-100 bg-stone-50">
                <div className="grid grid-cols-6 gap-2 mb-3">
                  <input type="text" placeholder="Time"   className="p-2 text-sm border border-stone-200 rounded outline-none focus:border-amber-500" value={newItem.time}   onChange={e => setNewItem({...newItem, time: e.target.value})} />
                  <input type="text" placeholder="Length" className="p-2 text-sm border border-stone-200 rounded outline-none focus:border-amber-500" value={newItem.length} onChange={e => setNewItem({...newItem, length: e.target.value})} />
                  <select className="p-2 text-sm border border-stone-200 rounded outline-none focus:border-amber-500" value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value})}>
                    {PLAN_ITEM_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <input type="text" placeholder="Title"  className="p-2 text-sm border border-stone-200 col-span-2 rounded outline-none focus:border-amber-500" value={newItem.title}  onChange={e => setNewItem({...newItem, title: e.target.value})} />
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
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <div className={`${theme.bg} px-5 py-3 text-white flex justify-between items-center`}>
              <div className="flex items-center gap-2"><Sparkles size={16} className="text-white/80" /><h3 className="font-semibold text-sm">AI Assistant</h3></div>

            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <textarea className="w-full sm:flex-1 p-3 border border-stone-200 rounded-lg text-sm focus:ring-1 focus:ring-amber-500 outline-none resize-none bg-stone-50" placeholder="Topic, text, or theme..." rows="3" value={prompt} onChange={(e) => setPrompt(e.target.value)}></textarea>
                <button onClick={handleGenerate} disabled={isGenerating || !prompt} className={`w-full sm:w-auto shrink-0 px-5 py-2.5 ${theme.bg} text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50`}>
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : 'Generate Guide'}
                </button>
              </div>
              {result && (
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl min-h-[160px]">
                  <MarkdownRenderer content={result} />
                </div>
              )}
            </div>
          </div>
        )}
        </>)}

        {activeTab === 'teams' && (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
              <h3 className="font-semibold text-stone-800 flex items-center gap-2"><Users size={16}/> Service Team Assignments</h3>
              {isAdmin && (
                <button
                  onClick={() => setServiceTeamAssignments(prev => [...prev, { id: Date.now(), role: 'New Role', person: '', status: 'Pending' }])}
                  className="text-xs font-medium text-stone-600 hover:text-stone-900 flex items-center gap-1 px-3 py-1.5 rounded-md border border-stone-200 bg-white hover:bg-stone-50"
                >
                  <Plus size={13}/> Add Role
                </button>
              )}
            </div>
            <div className="divide-y divide-stone-100">
              {serviceTeamAssignments.map((row) => (
                <div key={row.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-stone-50 group">
                  <div className="flex-1 grid grid-cols-2 gap-3 mr-4">
                    {isAdmin ? (
                      <input
                        type="text"
                        className="text-sm font-semibold text-stone-900 border border-transparent rounded px-2 py-1 outline-none focus:border-amber-400 focus:bg-amber-50 bg-transparent"
                        value={row.role}
                        onChange={(e) => setServiceTeamAssignments(prev => prev.map(a => a.id === row.id ? { ...a, role: e.target.value } : a))}
                      />
                    ) : (
                      <p className="text-sm font-semibold text-stone-900 px-2 py-1">{row.role}</p>
                    )}
                    {isAdmin ? (
                      <input
                        type="text"
                        className="text-sm text-stone-600 border border-transparent rounded px-2 py-1 outline-none focus:border-amber-400 focus:bg-amber-50 bg-transparent"
                        value={row.person}
                        placeholder="Assign person…"
                        onChange={(e) => setServiceTeamAssignments(prev => prev.map(a => a.id === row.id ? { ...a, person: e.target.value } : a))}
                      />
                    ) : (
                      <p className="text-sm text-stone-500 px-2 py-1">{row.person}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                      onClick={() => {
                        const cycle = ['Confirmed', 'Pending', 'Unavailable'];
                        const next = cycle[(cycle.indexOf(row.status) + 1) % cycle.length];
                        setServiceTeamAssignments(prev => prev.map(a => a.id === row.id ? { ...a, status: next } : a));
                      }}
                      title="Click to change status"
                      className={`text-xs font-bold px-2.5 py-1 rounded cursor-pointer transition-colors select-none ${
                        row.status === 'Confirmed'   ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' :
                        row.status === 'Unavailable' ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' :
                                                        'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      }`}
                    >
                      {row.status}
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => setServiceTeamAssignments(prev => prev.filter(a => a.id !== row.id))}
                        className="opacity-0 group-hover:opacity-100 p-1 text-rose-400 hover:text-rose-600 transition-all rounded"
                      >
                        <Trash2 size={14}/>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'times' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {serviceTimes.map(st => (
                <div key={st.id} className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 group relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${theme.light} ${theme.color} flex-shrink-0`}><Clock size={18}/></div>
                    {isAdmin ? (
                      <input
                        className="font-bold text-stone-900 text-sm border border-transparent rounded px-1 outline-none focus:border-amber-400 focus:bg-amber-50 bg-transparent w-full"
                        value={st.label}
                        onChange={e => setServiceTimes(prev => prev.map(s => s.id === st.id ? { ...s, label: e.target.value } : s))}
                      />
                    ) : (
                      <h3 className="font-bold text-stone-900">{st.label}</h3>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => setServiceTimes(prev => prev.filter(s => s.id !== st.id))}
                        className="opacity-0 group-hover:opacity-100 ml-auto p-1 text-rose-400 hover:text-rose-600 transition-all rounded flex-shrink-0"
                      >
                        <Trash2 size={14}/>
                      </button>
                    )}
                  </div>
                  {isAdmin ? (
                    <input
                      className="text-2xl font-bold text-stone-900 border border-transparent rounded px-1 outline-none focus:border-amber-400 focus:bg-amber-50 bg-transparent w-full"
                      value={st.time}
                      onChange={e => setServiceTimes(prev => prev.map(s => s.id === st.id ? { ...s, time: e.target.value } : s))}
                      placeholder="e.g. 8:00 AM"
                    />
                  ) : (
                    <p className="text-2xl font-bold text-stone-900">{st.time}</p>
                  )}
                  {isAdmin ? (
                    <input
                      className="text-xs text-stone-500 mt-1 border border-transparent rounded px-1 outline-none focus:border-amber-400 focus:bg-amber-50 bg-transparent w-full"
                      value={st.location}
                      onChange={e => setServiceTimes(prev => prev.map(s => s.id === st.id ? { ...s, location: e.target.value } : s))}
                      placeholder="Location"
                    />
                  ) : (
                    <p className="text-xs text-stone-500 mt-1">{st.location}</p>
                  )}
                  <div className="flex items-center gap-1 mt-2">
                    {isAdmin ? (
                      <>
                        <input
                          type="number"
                          min="0"
                          className="text-xs text-stone-500 border border-transparent rounded px-1 outline-none focus:border-amber-400 focus:bg-amber-50 bg-transparent w-12 text-right"
                          value={st.volunteers}
                          onChange={e => setServiceTimes(prev => prev.map(s => s.id === st.id ? { ...s, volunteers: parseInt(e.target.value) || 0 } : s))}
                        />
                        <span className="text-xs text-stone-500">volunteers scheduled</span>
                      </>
                    ) : (
                      <p className="text-xs text-stone-500">{st.volunteers} volunteers scheduled</p>
                    )}
                  </div>
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
