import { useEffect, useRef, useState } from 'react';
import {
  Sparkles, Loader2, Plus, Search, Send, Workflow,
  Smartphone, Mail, X, Hash, Trash2, Pencil, ArrowRight,
  Zap, MessageSquare, Bell, ToggleLeft, ToggleRight, Check,
  ChevronRight, Users,
} from 'lucide-react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { callAI } from '../lib/gemini';
import { createWorkflow, createWorkflowInboxMessage, deleteWorkflow, updateWorkflow, createWorkflowKeyword, deleteWorkflowKeyword } from '../lib/firestoreServices';
import { db } from '../config/firebase';

const SMS_LIMIT = 160;

const TRIGGER_OPTIONS = [
  'When someone joins a list',
  'Date based (e.g. Birthday)',
  'New first-time guest',
  'After giving is recorded',
  'When a keyword is texted',
];
const ACTION_OPTIONS = [
  'Send SMS',
  'Send Email',
  'Alert Staff',
  'Add to List',
];
const AUDIENCE_OPTIONS = [
  'First-Time Guests',
  'Lapsed Volunteers',
  'New Members',
  'Small Group Leaders',
  'All Contacts',
];

function InitialsAvatar({ name, size = 'md' }) {
  const initials = name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?';
  const colors = ['bg-violet-500', 'bg-teal-500', 'bg-rose-500', 'bg-amber-500', 'bg-blue-500'];
  const color = colors[name?.charCodeAt(0) % colors.length] || 'bg-stone-400';
  const sz = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs';
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
      {initials}
    </div>
  );
}

function WorkflowPipelineCard({ workflow, onEdit, onDelete, onToggle }) {
  const isEmail = workflow.iconName === 'Mail' || workflow.actions?.toLowerCase().includes('email');
  const ActionIcon = isEmail ? Mail : Smartphone;
  const isActive = workflow.active !== false;

  return (
    <div className={`bg-white rounded-xl border shadow-sm transition-all ${isActive ? 'border-stone-200' : 'border-stone-100 opacity-60'}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1.5 rounded-lg ${isActive ? 'bg-violet-100 text-violet-600' : 'bg-stone-100 text-stone-400'}`}>
              <Zap size={14} />
            </div>
            <h4 className="font-semibold text-stone-900 text-sm truncate">{workflow.title}</h4>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onToggle(workflow.id, !isActive)}
              className={`transition-colors ${isActive ? 'text-teal-500 hover:text-teal-600' : 'text-stone-300 hover:text-stone-500'}`}
              title={isActive ? 'Deactivate' : 'Activate'}
            >
              {isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
            </button>
            <button onClick={() => onEdit(workflow)} className="p-1 text-stone-300 hover:text-stone-600 transition-colors" title="Edit"><Pencil size={13} /></button>
            <button onClick={() => onDelete(workflow.id)} className="p-1 text-stone-300 hover:text-rose-500 transition-colors" title="Delete"><Trash2 size={13} /></button>
          </div>
        </div>

        {/* Visual pipeline */}
        <div className="flex items-center gap-2 bg-stone-50 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="p-1.5 bg-amber-100 text-amber-600 rounded-md shrink-0"><Bell size={11} /></div>
            <span className="text-[11px] text-stone-600 font-medium truncate">{workflow.trigger}</span>
          </div>
          <ArrowRight size={12} className="text-stone-300 shrink-0" />
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className={`p-1.5 rounded-md shrink-0 ${isEmail ? 'bg-blue-100 text-blue-600' : 'bg-violet-100 text-violet-600'}`}>
              <ActionIcon size={11} />
            </div>
            <span className="text-[11px] text-stone-600 font-medium truncate">{workflow.actions}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2.5">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${isActive ? 'bg-teal-100 text-teal-700' : 'bg-stone-100 text-stone-500'}`}>
            {isActive ? 'Active' : 'Paused'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function WorkflowsApp({ theme, workflows = [], setWorkflows, showToast }) {
  const [activeSubTab, setActiveSubTab] = useState('automations');

  // ── Automations ────────────────────────────────────────────────────────────
  const [isNewWorkflow, setIsNewWorkflow] = useState(false);
  const [isEditingWorkflow, setIsEditingWorkflow] = useState(false);
  const [editingWorkflowId, setEditingWorkflowId] = useState(null);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowTrigger, setWorkflowTrigger] = useState(TRIGGER_OPTIONS[0]);
  const [workflowAction, setWorkflowAction] = useState(ACTION_OPTIONS[0]);

  // ── AI Outreach Drawer ─────────────────────────────────────────────────────
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false);
  const [aiAudience, setAiAudience] = useState(AUDIENCE_OPTIONS[0]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiDraft, setAiDraft] = useState('');

  // ── Inbox ──────────────────────────────────────────────────────────────────
  const [replyText, setReplyText] = useState('');
  const [activeThreadId, setActiveThreadId] = useState('sarah-jenkins');
  const [conversation, setConversation] = useState([]);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [isDraftingReply, setIsDraftingReply] = useState(false);
  const msgEndRef = useRef(null);

  // ── Keywords ───────────────────────────────────────────────────────────────
  const [keywords, setKeywords] = useState([
    { id: 1, keyword: 'INFO', response: 'Thanks for texting! Visit lifegate.ag for service times and more.' },
    { id: 2, keyword: 'GIVE', response: 'You can give online at lifegate.ag/give. God bless you!' },
    { id: 3, keyword: 'STOP', response: 'You have been unsubscribed. Reply START to resubscribe anytime.' },
  ]);
  const [newKeyword, setNewKeyword] = useState({ keyword: '', response: '' });
  const [editingKeywordId, setEditingKeywordId] = useState(null);
  const [editingKeywordText, setEditingKeywordText] = useState('');
  const [testKeyword, setTestKeyword] = useState(null);

  // ── Firestore: keywords ────────────────────────────────────────────────────
  useEffect(() => {
    if (!db) return undefined;
    const q = query(collection(db, 'workflowKeywords'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) setKeywords(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
    }, (err) => console.warn('[WorkflowsApp] keywords:', err.message));
    return () => unsub();
  }, []);

  // ── Firestore: inbox thread ────────────────────────────────────────────────
  useEffect(() => {
    if (!db) {
      setConversation([
        { id: 1, text: 'Hi Sarah! Thanks for visiting Lifegate yesterday. We loved having you. Do you have any questions?', fromUs: true, ts: '10:40 AM' },
        { id: 2, text: 'Thank you! What time is youth group?', fromUs: false, ts: '10:42 AM' },
      ]);
      return undefined;
    }
    setConversationLoading(true);
    const q = query(collection(db, 'workflowInboxMessages'), where('threadId', '==', activeThreadId), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setConversation(snap.docs.map((d) => ({ id: d.id, text: d.data().text || '', fromUs: Boolean(d.data().fromUs) })));
      setConversationLoading(false);
    }, (err) => { console.error('[WorkflowsApp] inbox:', err); setConversationLoading(false); });
    return () => unsub();
  }, [activeThreadId]);

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conversation]);

  // ── Handlers: automations ──────────────────────────────────────────────────
  const handleCreateWorkflow = async () => {
    if (!workflowName.trim()) return;
    const payload = { title: workflowName, trigger: workflowTrigger, actions: workflowAction, iconName: workflowAction.includes('SMS') ? 'Smartphone' : 'Mail', active: true };
    const tempId = `temp-${Date.now()}`;
    setWorkflows((prev) => [...prev, { id: tempId, ...payload }]);
    setIsNewWorkflow(false); setWorkflowName('');
    try {
      const created = await createWorkflow(payload);
      setWorkflows((prev) => prev.map((w) => (w.id === tempId ? created : w)));
      showToast('Workflow created');
    } catch (err) {
      console.error('[WorkflowsApp]', err);
      setWorkflows((prev) => prev.filter((w) => w.id !== tempId));
      showToast('Failed to create workflow');
    }
  };

  const handleUpdateWorkflow = async () => {
    if (!workflowName.trim() || !editingWorkflowId) return;
    const payload = { title: workflowName, trigger: workflowTrigger, actions: workflowAction, iconName: workflowAction.includes('SMS') ? 'Smartphone' : 'Mail' };
    const prev = workflows.find((w) => w.id === editingWorkflowId);
    setWorkflows((wfs) => wfs.map((w) => (w.id === editingWorkflowId ? { ...w, ...payload } : w)));
    setIsEditingWorkflow(false); setEditingWorkflowId(null); setWorkflowName('');
    try {
      await updateWorkflow(String(editingWorkflowId), payload);
      showToast('Workflow updated');
    } catch (err) {
      console.error('[WorkflowsApp]', err);
      if (prev) setWorkflows((wfs) => wfs.map((w) => (w.id === prev.id ? prev : w)));
      showToast('Failed to update workflow');
    }
  };

  const handleDeleteWorkflow = async (id) => {
    const removed = workflows.find((w) => w.id === id);
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
    try { await deleteWorkflow(String(id)); showToast('Workflow removed'); }
    catch (err) { console.error('[WorkflowsApp]', err); if (removed) setWorkflows((prev) => [...prev, removed]); showToast('Failed to remove'); }
  };

  const handleToggleWorkflow = async (id, active) => {
    setWorkflows((prev) => prev.map((w) => (w.id === id ? { ...w, active } : w)));
    try { await updateWorkflow(String(id), { active }); }
    catch (err) { console.error('[WorkflowsApp]', err); setWorkflows((prev) => prev.map((w) => (w.id === id ? { ...w, active: !active } : w))); }
  };

  const openEditWorkflow = (wf) => {
    setEditingWorkflowId(wf.id);
    setWorkflowName(wf.title || '');
    setWorkflowTrigger(wf.trigger || TRIGGER_OPTIONS[0]);
    setWorkflowAction(wf.actions || ACTION_OPTIONS[0]);
    setIsEditingWorkflow(true);
  };

  // ── Handlers: AI drawer ────────────────────────────────────────────────────
  const handleGenerateDraft = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true); setAiDraft('');
    const ctx = `You are a church communications director writing warm, engaging outreach messages for ${aiAudience}. Keep SMS under 160 characters. Be friendly and genuine.`;
    const result = await callAI(aiPrompt, ctx);
    setAiDraft(result);
    setIsGenerating(false);
  };

  // ── Handlers: inbox ────────────────────────────────────────────────────────
  const sendReply = async (text) => {
    const t = text.trim();
    if (!t) return;
    const tempId = `temp-inbox-${Date.now()}`;
    setConversation((prev) => [...prev, { id: tempId, text: t, fromUs: true }]);
    setReplyText('');
    try {
      await createWorkflowInboxMessage({ threadId: activeThreadId, fromUs: true, text: t });
      setConversation((prev) => prev.filter((m) => m.id !== tempId));
    } catch (err) {
      console.error('[WorkflowsApp]', err);
      setConversation((prev) => prev.filter((m) => m.id !== tempId));
      showToast('Message failed to send.');
    }
  };

  const handleAIDraftReply = async () => {
    setIsDraftingReply(true);
    const lastMsg = conversation.filter((m) => !m.fromUs).at(-1)?.text || '';
    const ctx = `You are a church staff member replying to a text message from a congregant. Keep replies warm, concise, and under 160 characters. The last message from them was: "${lastMsg}"`;
    const result = await callAI('Write a helpful reply to this message', ctx);
    if (result && !result.startsWith('AI ')) setReplyText(result.slice(0, SMS_LIMIT));
    setIsDraftingReply(false);
  };

  // ── Handlers: keywords ────────────────────────────────────────────────────
  const handleSaveKeyword = async () => {
    if (!newKeyword.keyword.trim() || !newKeyword.response.trim()) return;
    try { await createWorkflowKeyword(newKeyword); }
    catch { setKeywords((prev) => [...prev, { id: Date.now(), ...newKeyword }]); }
    setNewKeyword({ keyword: '', response: '' });
    showToast('Keyword saved');
  };

  const handleDeleteKeyword = async (id) => {
    const removed = keywords.find((k) => k.id === id);
    setKeywords((prev) => prev.filter((k) => k.id !== id));
    try { await deleteWorkflowKeyword(id); }
    catch { if (removed) setKeywords((prev) => [...prev, removed]); }
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const activeCount = workflows.filter((w) => w.active !== false).length;

  // ── Shared modal form ──────────────────────────────────────────────────────
  const WorkflowModal = ({ title: modalTitle, onSave, onClose }) => (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <Workflow size={18} className={theme.color} /> {modalTitle}
          </h2>
          <button onClick={onClose} className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1 block">Name</label>
            <input type="text" placeholder="e.g. Welcome New Guest" className="w-full p-2.5 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-violet-400 text-sm" value={workflowName} onChange={(e) => setWorkflowName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1 block flex items-center gap-1"><Bell size={10}/> Trigger</label>
            <select className="w-full p-2.5 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-violet-400 text-sm text-stone-700 bg-white" value={workflowTrigger} onChange={(e) => setWorkflowTrigger(e.target.value)}>
              {TRIGGER_OPTIONS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1 block flex items-center gap-1"><Zap size={10}/> Action</label>
            <select className="w-full p-2.5 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-violet-400 text-sm text-stone-700 bg-white" value={workflowAction} onChange={(e) => setWorkflowAction(e.target.value)}>
              {ACTION_OPTIONS.map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
          {/* Preview */}
          <div className="flex items-center gap-2 bg-stone-50 rounded-lg p-2.5 mt-1">
            <div className="p-1.5 bg-amber-100 text-amber-600 rounded-md"><Bell size={11} /></div>
            <span className="text-[11px] text-stone-500 truncate">{workflowTrigger}</span>
            <ArrowRight size={11} className="text-stone-300 shrink-0" />
            <div className="p-1.5 bg-violet-100 text-violet-600 rounded-md">{workflowAction.includes('Email') ? <Mail size={11}/> : <Smartphone size={11}/>}</div>
            <span className="text-[11px] text-stone-500 truncate">{workflowAction}</span>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 text-stone-600 hover:bg-stone-100 rounded-lg font-medium text-sm">Cancel</button>
          <button onClick={onSave} className={`flex-1 py-2 ${theme.bg} text-white rounded-lg font-semibold text-sm hover:opacity-90`}>Save &amp; Activate</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">

      {/* ── Header ── */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Comms &amp; Workflows</h1>
          <p className="text-stone-500 text-sm mt-1">Automations, 2-way texting, and keywords.</p>
        </div>
        {activeSubTab === 'automations' && (
          <div className="flex gap-2">
            <button onClick={() => setIsAIDrawerOpen(true)} className="px-3 py-2 border border-stone-200 bg-white rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-50 shadow-sm flex items-center gap-1.5">
              <Sparkles size={14} className={theme.color} /> AI Generate
            </button>
            <button onClick={() => setIsNewWorkflow(true)} className={`px-4 py-2 ${theme.bg} text-white rounded-lg text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-1.5`}>
              <Plus size={15} /> New Workflow
            </button>
          </div>
        )}
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active Automations', value: activeCount, icon: Zap, color: 'text-violet-600 bg-violet-50' },
          { label: 'Keywords', value: keywords.length, icon: Hash, color: 'text-teal-600 bg-teal-50' },
          { label: 'Inbox Threads', value: 1, icon: MessageSquare, color: 'text-blue-600 bg-blue-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${color}`}><Icon size={16} /></div>
            <div>
              <p className="text-xl font-bold text-stone-900">{value}</p>
              <p className="text-xs text-stone-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab nav ── */}
      <div className="border-b border-stone-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'automations', label: 'Automations' },
            { id: 'inbox', label: '2-Way Inbox', badge: 1 },
            { id: 'keywords', label: 'Keywords' },
          ].map(({ id, label, badge }) => (
            <button
              key={id}
              onClick={() => setActiveSubTab(id)}
              className={`border-b-2 py-3 px-1 text-sm font-medium flex items-center gap-2 transition-colors ${activeSubTab === id ? `${theme.border} ${theme.color}` : 'border-transparent text-stone-500 hover:text-stone-700'}`}
            >
              {label}
              {badge ? <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{badge}</span> : null}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Automations tab ── */}
      {activeSubTab === 'automations' && (
        <div className="animate-in fade-in duration-300">
          {workflows.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-stone-200 border-dashed">
              <Workflow size={32} className="text-stone-300 mx-auto mb-3" />
              <p className="text-stone-500 font-medium">No automations yet</p>
              <p className="text-stone-400 text-sm mt-1 mb-4">Create your first workflow to automate outreach.</p>
              <button onClick={() => setIsNewWorkflow(true)} className={`px-4 py-2 ${theme.bg} text-white rounded-lg text-sm font-medium`}><Plus size={14} className="inline mr-1" />New Workflow</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map((w) => (
                <WorkflowPipelineCard
                  key={w.id}
                  workflow={w}
                  onEdit={openEditWorkflow}
                  onDelete={handleDeleteWorkflow}
                  onToggle={handleToggleWorkflow}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Inbox tab ── */}
      {activeSubTab === 'inbox' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden h-[560px] flex animate-in fade-in duration-300">
          {/* Contact list */}
          <div className="w-72 border-r border-stone-200 flex flex-col bg-stone-50/60 shrink-0">
            <div className="p-3 border-b border-stone-200">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input type="text" placeholder="Search…" className="w-full pl-8 pr-3 py-1.5 border border-stone-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-violet-400 bg-white" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {[{ id: 'sarah-jenkins', name: 'Sarah Jenkins', preview: 'What time is youth group?', time: '10:42 AM', unread: 1 }].map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`w-full flex items-center gap-3 p-3.5 text-left border-b border-stone-100 hover:bg-white transition-colors ${activeThreadId === thread.id ? 'bg-white border-l-2 border-l-violet-500' : ''}`}
                >
                  <InitialsAvatar name={thread.name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-stone-900 text-sm">{thread.name}</span>
                      <span className="text-[10px] text-stone-400">{thread.time}</span>
                    </div>
                    <p className="text-xs text-stone-500 truncate mt-0.5">{thread.preview}</p>
                  </div>
                  {thread.unread > 0 && (
                    <span className="bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shrink-0">{thread.unread}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation pane */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-4 py-3 border-b border-stone-200 flex items-center gap-3 bg-white">
              <InitialsAvatar name="Sarah Jenkins" size="sm" />
              <div>
                <h3 className="font-bold text-stone-900 text-sm">Sarah Jenkins</h3>
                <p className="text-[11px] text-stone-400 flex items-center gap-1"><Users size={10}/> First-Time Guest</p>
              </div>
            </div>

            <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto bg-stone-50/30">
              {conversationLoading && <p className="text-xs text-stone-400 text-center py-4">Loading…</p>}
              {conversation.map((msg) => (
                <div key={msg.id} className={`flex flex-col gap-0.5 ${msg.fromUs ? 'items-end' : 'items-start'}`}>
                  <div className={`px-3.5 py-2 rounded-2xl max-w-[75%] text-sm leading-relaxed ${msg.fromUs ? 'bg-violet-600 text-white rounded-tr-sm' : 'bg-white border border-stone-200 text-stone-800 rounded-tl-sm shadow-sm'}`}>
                    {msg.text}
                  </div>
                  {msg.ts && <span className="text-[10px] text-stone-400 px-1">{msg.ts}</span>}
                </div>
              ))}
              <div ref={msgEndRef} />
            </div>

            <div className="p-3 border-t border-stone-200 bg-white space-y-2">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <textarea
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:ring-1 focus:ring-violet-400 resize-none bg-white leading-snug"
                    placeholder="Type an SMS reply…"
                    rows={2}
                    maxLength={SMS_LIMIT}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(replyText); } }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={handleAIDraftReply}
                    disabled={isDraftingReply}
                    className={`px-3 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-medium flex items-center gap-1 disabled:opacity-50`}
                    title="AI draft reply"
                  >
                    {isDraftingReply ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} className={theme.color} />}
                    Draft
                  </button>
                  <button
                    onClick={() => sendReply(replyText)}
                    disabled={!replyText.trim()}
                    className="px-3 py-2 bg-violet-600 text-white rounded-xl text-xs font-semibold hover:bg-violet-700 disabled:opacity-40 flex items-center gap-1"
                  >
                    <Send size={13} /> Send
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] text-stone-400">Press Enter to send · Shift+Enter for new line</span>
                <span className={`text-[10px] font-mono ${replyText.length > SMS_LIMIT * 0.9 ? 'text-rose-500' : 'text-stone-400'}`}>
                  {replyText.length}/{SMS_LIMIT}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Keywords tab ── */}
      {activeSubTab === 'keywords' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 bg-stone-50 flex items-center gap-2">
              <Hash size={15} className="text-stone-500" />
              <h3 className="font-semibold text-stone-800">Auto-Response Keywords</h3>
              <span className="ml-auto text-xs text-stone-400">{keywords.length} keywords</span>
            </div>
            <div className="divide-y divide-stone-100">
              {keywords.map((kw) => (
                <div key={kw.id} className="px-5 py-3.5 hover:bg-stone-50 transition-colors">
                  {editingKeywordId === kw.id ? (
                    <div className="flex items-start gap-3">
                      <span className="mt-1 inline-block bg-violet-100 text-violet-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider shrink-0">{kw.keyword}</span>
                      <div className="flex-1">
                        <textarea
                          className="w-full p-2 border border-stone-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-violet-400 resize-none"
                          rows={2}
                          maxLength={SMS_LIMIT}
                          value={editingKeywordText}
                          onChange={(e) => setEditingKeywordText(e.target.value)}
                        />
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-stone-400">{editingKeywordText.length}/{SMS_LIMIT} chars</span>
                          <div className="flex gap-1.5">
                            <button onClick={() => setEditingKeywordId(null)} className="px-2.5 py-1 text-xs text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200">Cancel</button>
                            <button
                              onClick={async () => {
                                setKeywords((prev) => prev.map((k) => (k.id === kw.id ? { ...k, response: editingKeywordText } : k)));
                                setEditingKeywordId(null);
                                showToast('Keyword updated');
                              }}
                              className={`px-2.5 py-1 text-xs text-white ${theme.bg} rounded-lg flex items-center gap-1`}
                            >
                              <Check size={11} /> Save
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <span className="mt-0.5 inline-block bg-violet-100 text-violet-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider shrink-0">{kw.keyword}</span>
                        <p className="text-sm text-stone-600 leading-relaxed">{kw.response}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setTestKeyword(kw)}
                          className="px-2 py-1 text-[11px] font-medium text-teal-700 bg-teal-50 rounded-md hover:bg-teal-100 transition-colors"
                          title="Test this keyword"
                        >
                          Test
                        </button>
                        <button onClick={() => { setEditingKeywordId(kw.id); setEditingKeywordText(kw.response); }} className="p-1.5 text-stone-300 hover:text-stone-600 transition-colors" title="Edit"><Pencil size={13} /></button>
                        <button onClick={() => handleDeleteKeyword(kw.id)} className="p-1.5 text-stone-300 hover:text-rose-500 transition-colors" title="Delete"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add keyword */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
            <h3 className="font-semibold text-stone-800 mb-3 text-sm">Add Keyword</h3>
            <div className="flex gap-3 flex-col sm:flex-row">
              <input
                type="text"
                placeholder="KEYWORD"
                className="w-28 p-2.5 border border-stone-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-violet-400 font-mono uppercase tracking-widest"
                value={newKeyword.keyword}
                onChange={(e) => setNewKeyword((k) => ({ ...k, keyword: e.target.value.toUpperCase() }))}
              />
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Auto-response message…"
                  className="w-full p-2.5 border border-stone-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-violet-400"
                  maxLength={SMS_LIMIT}
                  value={newKeyword.response}
                  onChange={(e) => setNewKeyword((k) => ({ ...k, response: e.target.value }))}
                />
                {newKeyword.response.length > 0 && (
                  <span className="absolute right-2.5 bottom-2 text-[10px] text-stone-400">{newKeyword.response.length}/{SMS_LIMIT}</span>
                )}
              </div>
              <button onClick={handleSaveKeyword} className={`px-4 py-2.5 ${theme.bg} text-white rounded-lg text-sm font-semibold hover:opacity-90 shrink-0`}>Save Keyword</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Workflow modals ── */}
      {isNewWorkflow && <WorkflowModal title="Build Automation" onSave={handleCreateWorkflow} onClose={() => setIsNewWorkflow(false)} />}
      {isEditingWorkflow && <WorkflowModal title="Edit Automation" onSave={handleUpdateWorkflow} onClose={() => { setIsEditingWorkflow(false); setEditingWorkflowId(null); setWorkflowName(''); }} />}

      {/* ── AI Outreach Drawer ── */}
      {isAIDrawerOpen && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex justify-end" onClick={() => setIsAIDrawerOpen(false)}>
          <div className="bg-white w-full max-w-sm h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <h2 className="font-bold text-stone-900 flex items-center gap-2"><Sparkles size={16} className={theme.color} /> AI Outreach Generator</h2>
              <button onClick={() => setIsAIDrawerOpen(false)} className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5 block">Audience</label>
                <select className="w-full p-2.5 border border-stone-200 rounded-lg text-sm bg-white outline-none focus:ring-1 focus:ring-violet-400" value={aiAudience} onChange={(e) => setAiAudience(e.target.value)}>
                  {AUDIENCE_OPTIONS.map((a) => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5 block">Prompt</label>
                <textarea
                  className="w-full p-2.5 border border-stone-200 rounded-lg text-sm bg-white outline-none focus:ring-1 focus:ring-violet-400 resize-none"
                  rows={4}
                  placeholder="e.g. Draft a warm welcome text inviting a first-time guest to coffee…"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                />
              </div>
              <button
                onClick={handleGenerateDraft}
                disabled={isGenerating || !aiPrompt.trim()}
                className={`w-full py-2.5 ${theme.bg} text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2`}
              >
                {isGenerating ? <Loader2 size={15} className="animate-spin" /> : <><Sparkles size={15} /> Generate Draft</>}
              </button>
              {aiDraft && (
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Generated Draft</p>
                  <textarea
                    className="w-full p-2 bg-white border border-stone-200 rounded-lg text-sm focus:ring-1 focus:ring-violet-400 outline-none resize-none"
                    rows={4}
                    value={aiDraft}
                    onChange={(e) => setAiDraft(e.target.value)}
                    maxLength={SMS_LIMIT}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-stone-400">{aiDraft.length}/{SMS_LIMIT} chars</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(aiDraft); showToast('Copied to clipboard'); }}
                      className="text-xs font-medium text-stone-600 hover:text-stone-900 flex items-center gap-1"
                    >
                      <ChevronRight size={12} /> Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Keyword test modal ── */}
      {testKeyword && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setTestKeyword(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-stone-900">Keyword Test Preview</h3>
              <button onClick={() => setTestKeyword(null)} className="p-1 text-stone-400 hover:text-stone-600"><X size={16} /></button>
            </div>
            <div className="bg-stone-100 rounded-xl p-4 space-y-3">
              <div className="flex justify-end">
                <div className="bg-stone-600 text-white text-sm px-3 py-2 rounded-2xl rounded-tr-sm max-w-[80%]">
                  {testKeyword.keyword}
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-white border border-stone-200 text-stone-800 text-sm px-3 py-2 rounded-2xl rounded-tl-sm max-w-[80%] shadow-sm">
                  {testKeyword.response}
                </div>
              </div>
            </div>
            <p className="text-xs text-stone-400 text-center mt-3">This is how the auto-response will appear.</p>
          </div>
        </div>
      )}
    </div>
  );
}


export default function WorkflowsApp({ theme, workflows = [], setWorkflows, showToast }) {
  const [activeSubTab, setActiveSubTab] = useState('automations');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isNewWorkflow, setIsNewWorkflow] = useState(false);
  const [isEditingWorkflow, setIsEditingWorkflow] = useState(false);
  const [editingWorkflowId, setEditingWorkflowId] = useState(null);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowTrigger, setWorkflowTrigger] = useState("Trigger: When someone joins a list");
  const [workflowAction, setWorkflowAction] = useState("Action: Send SMS");
  const [keywords, setKeywords] = useState([
    { id: 1, keyword: 'INFO', response: 'Thanks for texting! Visit lifegate.ag for service times and more.' },
    { id: 2, keyword: 'GIVE', response: 'You can give online at lifegate.ag/give. God bless you!' },
    { id: 3, keyword: 'STOP', response: 'You have been unsubscribed. Reply START to resubscribe anytime.' },
  ]);
  const [newKeyword, setNewKeyword] = useState({ keyword: '', response: '' });
  const [replyText, setReplyText] = useState('');
  const [activeThreadId, setActiveThreadId] = useState('sarah-jenkins');
  const [conversation, setConversation] = useState([]);
  const [conversationLoading, setConversationLoading] = useState(false);

  // Load keywords from Firestore
  useEffect(() => {
    if (!db) return undefined;
    const keywordsQuery = query(collection(db, 'workflowKeywords'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(keywordsQuery, (snapshot) => {
      if (!snapshot.empty) {
        setKeywords(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    }, (error) => {
      console.warn('[WorkflowsApp] Could not load keywords:', error.message);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!db) {
      setConversation([
        { id: 1, text: 'Hi Sarah! Thanks for visiting Lifegate yesterday. We loved having you. Do you have any questions about the church?', fromUs: true },
        { id: 2, text: 'Thank you! What time is youth group?', fromUs: false },
      ]);
      return undefined;
    }

    setConversationLoading(true);
    const inboxQuery = query(
      collection(db, 'workflowInboxMessages'),
      where('threadId', '==', activeThreadId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      inboxQuery,
      (snapshot) => {
        const nextConversation = snapshot.docs.map((messageDoc) => ({
          id: messageDoc.id,
          text: messageDoc.data().text || '',
          fromUs: Boolean(messageDoc.data().fromUs),
        }));
        setConversation(nextConversation);
        setConversationLoading(false);
      },
      (error) => {
        console.error('[WorkflowsApp] Failed to subscribe to inbox thread:', error);
        setConversationLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeThreadId]);

  const handleGenerateDraft = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    const context = `You are a church communications director writing a short, warm, and highly engaging SMS or email based on the prompt. Keep it under 2 sentences if it's a text.`;
    const responseText = await callAI(prompt, context);
    setPrompt(responseText);
    setIsGenerating(false);
  };

  const getIconForWorkflow = (workflow) => {
    if (workflow.iconName === 'Mail' || workflow.actions?.toLowerCase().includes('email')) {
      return Mail;
    }
    return Smartphone;
  };

  const handleCreateWorkflow = async () => {
    if (!workflowName.trim()) return;
    const iconName = workflowAction.includes('SMS') ? 'Smartphone' : 'Mail';
    const payload = {
      title: workflowName,
      trigger: workflowTrigger.replace('Trigger: ', ''),
      actions: workflowAction.replace('Action: ', ''),
      iconName,
    };

    const tempId = `temp-workflow-${Date.now()}`;
    setWorkflows((prev) => [...prev, { id: tempId, ...payload }]);
    setIsNewWorkflow(false);
    setWorkflowName('');

    try {
      const created = await createWorkflow(payload);
      setWorkflows((prev) => prev.map((workflow) => (workflow.id === tempId ? created : workflow)));
      showToast('Workflow Created Successfully');
    } catch (error) {
      console.error('[WorkflowsApp] Failed to create workflow:', error);
      setWorkflows((prev) => prev.filter((workflow) => workflow.id !== tempId));
      showToast('Failed to create workflow');
    }
  };

  const handleDeleteWorkflow = async (workflowId) => {
    const removedWorkflow = workflows.find((workflow) => workflow.id === workflowId);
    if (!removedWorkflow) return;

    setWorkflows((prev) => prev.filter((workflow) => workflow.id !== workflowId));
    try {
      await deleteWorkflow(String(workflowId));
      showToast('Workflow removed');
    } catch (error) {
      console.error('[WorkflowsApp] Failed to delete workflow:', error);
      setWorkflows((prev) => [...prev, removedWorkflow]);
      showToast('Failed to remove workflow');
    }
  };

  const openEditWorkflow = (workflow) => {
    setEditingWorkflowId(workflow.id);
    setWorkflowName(workflow.title || '');
    setWorkflowTrigger(`Trigger: ${workflow.trigger || 'When someone joins a list'}`);
    setWorkflowAction(`Action: ${workflow.actions || 'Send SMS'}`);
    setIsEditingWorkflow(true);
  };

  const handleUpdateWorkflow = async () => {
    if (!workflowName.trim() || !editingWorkflowId) return;

    const payload = {
      title: workflowName,
      trigger: workflowTrigger.replace('Trigger: ', ''),
      actions: workflowAction.replace('Action: ', ''),
      iconName: workflowAction.includes('SMS') ? 'Smartphone' : 'Mail',
    };

    const previous = workflows.find((workflow) => workflow.id === editingWorkflowId);
    setWorkflows((prev) => prev.map((workflow) => (
      workflow.id === editingWorkflowId ? { ...workflow, ...payload } : workflow
    )));
    setIsEditingWorkflow(false);
    setEditingWorkflowId(null);
    setWorkflowName('');

    try {
      await updateWorkflow(String(editingWorkflowId), payload);
      showToast('Workflow updated');
    } catch (error) {
      console.error('[WorkflowsApp] Failed to update workflow:', error);
      if (previous) {
        setWorkflows((prev) => prev.map((workflow) => (
          workflow.id === previous.id ? previous : workflow
        )));
      }
      showToast('Failed to update workflow');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Comms &amp; Workflows</h1>
          <p className="text-stone-500 text-sm mt-1">Manage automations, 2-way texting, and keywords.</p>
        </div>
        {activeSubTab === 'automations' && (
          <button onClick={() => setIsNewWorkflow(true)} className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}>
            <Plus size={16}/> New Workflow
          </button>
        )}
      </div>

      {isNewWorkflow && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2"><Workflow className={theme.color}/> Build Automation</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Workflow Name" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-violet-500" value={workflowName} onChange={e => setWorkflowName(e.target.value)} />
              <select className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-violet-500 text-sm text-stone-600" value={workflowTrigger} onChange={e => setWorkflowTrigger(e.target.value)}>
                <option>Trigger: When someone joins a list</option>
                <option>Trigger: Date based (e.g. Birthday)</option>
              </select>
              <select className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-violet-500 text-sm text-stone-600" value={workflowAction} onChange={e => setWorkflowAction(e.target.value)}>
                <option>Action: Send SMS</option>
                <option>Action: Send Email</option>
                <option>Action: Alert Staff</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsNewWorkflow(false)} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-md font-medium text-sm">Cancel</button>
              <button onClick={handleCreateWorkflow} className={`px-4 py-2 ${theme.bg} text-white rounded-md font-medium text-sm hover:opacity-90`}>Save &amp; Activate</button>
            </div>
          </div>
        </div>
      )}

      {isEditingWorkflow && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2"><Pencil className={theme.color}/> Edit Workflow</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Workflow Name" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-violet-500" value={workflowName} onChange={e => setWorkflowName(e.target.value)} />
              <select className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-violet-500 text-sm text-stone-600" value={workflowTrigger} onChange={e => setWorkflowTrigger(e.target.value)}>
                <option>Trigger: When someone joins a list</option>
                <option>Trigger: Date based (e.g. Birthday)</option>
              </select>
              <select className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-violet-500 text-sm text-stone-600" value={workflowAction} onChange={e => setWorkflowAction(e.target.value)}>
                <option>Action: Send SMS</option>
                <option>Action: Send Email</option>
                <option>Action: Alert Staff</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsEditingWorkflow(false)} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-md font-medium text-sm">Cancel</button>
              <button onClick={handleUpdateWorkflow} className={`px-4 py-2 ${theme.bg} text-white rounded-md font-medium text-sm hover:opacity-90`}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <div className="border-b border-stone-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button onClick={() => setActiveSubTab('automations')} className={`border-b-2 py-4 px-1 text-sm font-medium ${activeSubTab === 'automations' ? `${theme.border} ${theme.color}` : 'border-transparent text-stone-500 hover:text-stone-700'}`}>Automations</button>
          <button onClick={() => setActiveSubTab('inbox')}       className={`border-b-2 py-4 px-1 text-sm font-medium flex items-center gap-2 ${activeSubTab === 'inbox' ? `${theme.border} ${theme.color}` : 'border-transparent text-stone-500 hover:text-stone-700'}`}>
            2-Way Inbox <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">3</span>
          </button>
          <button onClick={() => setActiveSubTab('keywords')}    className={`border-b-2 py-4 px-1 text-sm font-medium ${activeSubTab === 'keywords' ? `${theme.border} ${theme.color}` : 'border-transparent text-stone-500 hover:text-stone-700'}`}>Keywords</button>
        </nav>
      </div>

      {activeSubTab === 'automations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden h-fit">
            <div className="p-4 border-b border-stone-100 bg-stone-50/50"><h2 className="font-semibold text-stone-800">AI Outreach Generator</h2></div>
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
                  className="w-full p-2 border border-stone-200 rounded text-sm bg-white outline-none focus:ring-1 focus:ring-violet-500 resize-none h-32"
                  placeholder="e.g. Draft a warm welcome text for a first-time guest inviting them to coffee..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>
              <button onClick={handleGenerateDraft} disabled={isGenerating || !prompt} className="w-full py-2.5 bg-stone-900 text-white rounded text-sm font-medium hover:bg-stone-800 transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : 'Generate Draft'}
              </button>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="p-4 border-b border-stone-100 bg-stone-50/50"><h2 className="font-semibold text-stone-800">Active Automations</h2></div>
              <div className="divide-y divide-stone-100">
                {workflows.map((w) => {
                  const Icon = getIconForWorkflow(w);
                  return (
                    <div key={w.id} className="relative pr-20">
                      <WorkflowCard title={w.title} trigger={w.trigger} actions={w.actions} icon={Icon} />
                      <button onClick={() => openEditWorkflow(w)} className="absolute right-20 top-4 px-2.5 py-1 text-xs font-semibold rounded-md text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-colors">
                        Edit
                      </button>
                      <button onClick={() => handleDeleteWorkflow(w.id)} className="absolute right-4 top-4 px-2.5 py-1 text-xs font-semibold rounded-md text-rose-700 bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-colors">
                        Delete
                      </button>
                    </div>
                  );
                })}
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
            </div>
          </div>
          <div className="flex-1 flex flex-col bg-white">
            <div className="p-4 border-b border-stone-200 flex justify-between items-center">
              <h3 className="font-bold text-stone-900">Sarah Jenkins</h3>
              <button className="text-stone-400 hover:text-stone-600"><MoreVertical size={18}/></button>
            </div>
            <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto bg-stone-50/30">
              {conversationLoading && <p className="text-xs text-stone-500">Loading thread...</p>}
              {conversation.map(msg => (
                <div key={msg.id} className={`${msg.fromUs ? 'self-end bg-violet-600 text-white' : 'self-start bg-stone-200 text-stone-800'} p-3 rounded-2xl ${msg.fromUs ? 'rounded-tr-sm' : 'rounded-tl-sm'} max-w-[75%] text-sm`}>{msg.text}</div>
              ))}
            </div>
            <div className="p-4 border-t border-stone-200 bg-white">
              <div className="flex gap-2">
                <input type="text" placeholder="Type an SMS reply..." className="flex-1 p-2 border border-stone-300 rounded-md text-sm outline-none focus:border-violet-500" value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={async e => {
                  if (e.key !== 'Enter') return;
                  const text = replyText.trim();
                  if (!text) return;
                  const tempId = `temp-inbox-${Date.now()}`;
                  setConversation(prev => [...prev, { id: tempId, text, fromUs: true }]);
                  setReplyText('');
                  try {
                    await createWorkflowInboxMessage({ threadId: activeThreadId, fromUs: true, text });
                    setConversation(prev => prev.filter(msg => msg.id !== tempId));
                  } catch (error) {
                    console.error('[WorkflowsApp] Failed to send inbox message:', error);
                    setConversation(prev => prev.filter(msg => msg.id !== tempId));
                    showToast('Message failed to send. Please retry.');
                  }
                }} />
                <button onClick={async () => {
                  const text = replyText.trim();
                  if (!text) return;
                  const tempId = `temp-inbox-${Date.now()}`;
                  setConversation(prev => [...prev, { id: tempId, text, fromUs: true }]);
                  setReplyText('');
                  try {
                    await createWorkflowInboxMessage({ threadId: activeThreadId, fromUs: true, text });
                    setConversation(prev => prev.filter(msg => msg.id !== tempId));
                  } catch (error) {
                    console.error('[WorkflowsApp] Failed to send inbox message:', error);
                    setConversation(prev => prev.filter(msg => msg.id !== tempId));
                    showToast('Message failed to send. Please retry.');
                  }
                }} className="px-4 py-2 bg-violet-600 text-white rounded-md text-sm font-medium hover:bg-violet-700"><Send size={16}/></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'keywords' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex items-center gap-2">
              <Hash size={16} className="text-stone-500"/>
              <h3 className="font-semibold text-stone-800">Auto-Response Keywords</h3>
            </div>
            <div className="divide-y divide-stone-100">
              {keywords.map(kw => (
                <div key={kw.id} className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-stone-50">
                  <div className="flex items-start gap-4">
                    <span className="mt-0.5 inline-block bg-violet-100 text-violet-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider shrink-0">
                      {kw.keyword}
                    </span>
                    <p className="text-sm text-stone-600">{kw.response}</p>
                  </div>
                  <button onClick={async () => {
                    try {
                      await deleteWorkflowKeyword(kw.id);
                    } catch (err) {
                      console.warn('[WorkflowsApp] Could not delete keyword:', err.message);
                      setKeywords(prev => prev.filter(k => k.id !== kw.id));
                    }
                  }} className="text-stone-300 hover:text-rose-500 shrink-0 transition-colors"><Trash2 size={15}/></button>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5">
            <h3 className="font-semibold text-stone-800 mb-4">Add Keyword</h3>
            <div className="flex gap-3 flex-col sm:flex-row">
              <input type="text" placeholder="Keyword (e.g. JOIN)" className="w-32 p-2 border border-stone-200 rounded-md text-sm outline-none focus:border-violet-500 font-mono uppercase" value={newKeyword.keyword} onChange={e => setNewKeyword(k => ({ ...k, keyword: e.target.value.toUpperCase() }))} />
              <input type="text" placeholder="Auto-response message…" className="flex-1 p-2 border border-stone-200 rounded-md text-sm outline-none focus:border-violet-500" value={newKeyword.response} onChange={e => setNewKeyword(k => ({ ...k, response: e.target.value }))} />
              <button onClick={async () => {
                if (!newKeyword.keyword.trim() || !newKeyword.response.trim()) return;
                try {
                  await createWorkflowKeyword(newKeyword);
                } catch (err) {
                  console.warn('[WorkflowsApp] Could not save keyword:', err.message);
                  setKeywords(prev => [...prev, { id: Date.now(), ...newKeyword }]);
                }
                setNewKeyword({ keyword: '', response: '' });
                showToast('Keyword saved');
              }} className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium hover:opacity-90 shrink-0`}>Save Keyword</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
