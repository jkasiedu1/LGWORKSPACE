import { useEffect, useState } from 'react';
import { Sparkles, Loader2, Plus, Search, Send, MoreVertical, Workflow, Smartphone, Mail, X, Hash, Trash2, Pencil } from 'lucide-react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { callAI } from '../lib/gemini';
import WorkflowCard from '../components/WorkflowCard';
import { createWorkflow, createWorkflowInboxMessage, deleteWorkflow, updateWorkflow, createWorkflowKeyword, deleteWorkflowKeyword } from '../lib/firestoreServices';
import { db } from '../config/firebase';

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
