import { useRef, useState, useEffect } from 'react';
import {
  FolderLock, ChevronRight, MessageSquare, Music, UserPlus,
  UploadCloud, File, ShieldAlert, Users, Lock, Plus, Search, X, Send, Pencil, Save, Trash2, ShieldCheck
} from 'lucide-react';
import { collection, getDocs, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { createTeamMessage, editTeamMessage, deleteTeamMessage, createTeamPortal, updateTeamPortal } from '../lib/firestoreServices';
import { db } from '../config/firebase';

function formatDateLabel(date) {
  const now = new Date();
  const d = new Date(date);
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function getInitials(name) {
  return (name || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function hashColor(str) {
  const palette = ['bg-violet-100 text-violet-700','bg-sky-100 text-sky-700','bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700','bg-rose-100 text-rose-700','bg-indigo-100 text-indigo-700','bg-teal-100 text-teal-700'];
  let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export default function TeamsApp({ theme, teamsList, setTeamsList, people, setActiveApp, isAdmin, showToast, globalSearch, user }) {
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Team Member';
  const [activePortal, setActivePortal] = useState(null);
  const [activeTab, setActiveTab] = useState('roster');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [memberToAdd, setMemberToAdd] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingPortal, setIsCreatingPortal] = useState(false);
  const [newPortal, setNewPortal] = useState({ name: '', desc: '', lead: '' });
  const [isEditingPortal, setIsEditingPortal] = useState(false);
  const [editingPortal, setEditingPortal] = useState({ name: '', desc: '', lead: '' });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessagesByTeam, setChatMessagesByTeam] = useState({});
  const [chatLoading, setChatLoading] = useState(false);
  const [editingChatMsgId, setEditingChatMsgId] = useState(null);
  const [editingChatMsgText, setEditingChatMsgText] = useState('');
  const [userProfiles, setUserProfiles] = useState([]);
  const [portalFiles, setPortalFiles] = useState([{ id: 1, name: 'Q1 Volunteer Handbook.pdf', date: '2 days ago' }]);
  const fileInputRef = useRef(null);
  const chatBottomRef = useRef(null);
  const editChatInputRef = useRef(null);

  useEffect(() => { if (globalSearch !== undefined) setSearchQuery(globalSearch); }, [globalSearch]);

  // Auto-scroll to bottom when chat opens or new messages arrive
  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
  }, [isChatOpen, chatMessagesByTeam]);

  const filteredTeams = teamsList.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPersonDisplayName = (person) => {
    if (!person) return 'Unknown Person';
    if (person.firstName || person.lastName) {
      return `${person.firstName || ''} ${person.lastName || ''}`.trim();
    }
    return person.name || person.email || 'Unknown Person';
  };

  const resolveMemberName = (member) => {
    const matchedPerson = people.find((person) => String(person.id) === String(member?.id));
    return matchedPerson ? getPersonDisplayName(matchedPerson) : (member?.name || 'Unknown Member');
  };

  useEffect(() => {
    if (!activePortal?.id || !db) return undefined;

    setChatLoading(true);
    const teamId = String(activePortal.id);
    const teamMessagesQuery = query(
      collection(db, 'teamMessages'),
      where('teamId', '==', teamId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      teamMessagesQuery,
      (snapshot) => {
        const messages = snapshot.docs.map((messageDoc) => {
          const data = messageDoc.data();
          const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null;
          return {
            id: messageDoc.id,
            text: data.text || '',
            from: data.from || 'Team Member',
            senderUid: data.senderUid || '',
            edited: data.edited || false,
            time: createdAt
              ? createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : data.time || 'Now',
            dateLabel: createdAt ? formatDateLabel(createdAt) : null,
            createdAtMs: createdAt ? createdAt.getTime() : 0,
          };
        });
        setChatMessagesByTeam((prev) => ({ ...prev, [teamId]: messages }));
        setChatLoading(false);
        setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      },
      (error) => {
        console.error('[TeamsApp] Failed to subscribe to team chat:', error);
        setChatLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activePortal?.id]);

  const handleAddMember = async () => {
    if (!memberToAdd) return;
    const person = people.find(p => p.id.toString() === memberToAdd);
    if (!person) return;
    const updatedTeams = teamsList.map((t) => {
      if (t.id === activePortal.id) {
        const existingRoster = t.roster || [];
        if (existingRoster.some((member) => String(member.id) === String(person.id))) {
          return t;
        }
        return { ...t, members: t.members + 1, roster: [...existingRoster, { id: person.id, name: getPersonDisplayName(person) }] };
      }
      return t;
    });
    const updatedPortal = updatedTeams.find((t) => t.id === activePortal.id);
    if (!updatedPortal) return;

    try {
      if (typeof activePortal.id === 'string') {
        await updateTeamPortal(activePortal.id, { members: updatedPortal.members, roster: updatedPortal.roster });
      }
      setTeamsList(updatedTeams);
      setActivePortal(updatedPortal);
      setIsAddingMember(false);
      showToast(`${getPersonDisplayName(person)} assigned to ${activePortal.name}`);
    } catch (error) {
      console.error('[TeamsApp] Failed to add member:', error);
      showToast('Failed to assign member');
    }
  };

  const handleStartPortalEdit = () => {
    if (!activePortal) return;
    setEditingPortal({
      name: activePortal.name || '',
      desc: activePortal.desc || '',
      lead: activePortal.lead || '',
      leadUid: activePortal.leadUid || '',
    });
    setIsEditingPortal(true);
    // Load registered users for lead assignment
    if (isAdmin && db) {
      getDocs(collection(db, 'userProfiles')).then(snap => {
        setUserProfiles(snap.docs.map(d => d.data()));
      }).catch(() => {});
    }
  };

  const handleRemoveMember = async (memberId) => {
    const updatedRoster = (activePortal.roster || []).filter((m) => String(m.id) !== String(memberId));
    const updates = { members: updatedRoster.length, roster: updatedRoster };
    const updatedTeams = teamsList.map((t) => (t.id === activePortal.id ? { ...t, ...updates } : t));
    const updatedPortal = updatedTeams.find((t) => t.id === activePortal.id);
    try {
      if (typeof activePortal.id === 'string') {
        await updateTeamPortal(activePortal.id, updates);
      }
      setTeamsList(updatedTeams);
      setActivePortal(updatedPortal);
      showToast('Member removed from roster');
    } catch (error) {
      console.error('[TeamsApp] Failed to remove member:', error);
      showToast('Failed to remove member');
    }
  };

  const handleSavePortalEdit = async () => {
    if (!activePortal?.id || !editingPortal.name.trim()) {
      showToast('Portal name is required.');
      return;
    }

    const updates = {
      name: editingPortal.name.trim(),
      desc: editingPortal.desc.trim(),
      lead: editingPortal.lead.trim() || 'Unassigned',
      leadUid: editingPortal.leadUid || '',
    };

    try {
      if (typeof activePortal.id === 'string') {
        await updateTeamPortal(activePortal.id, updates);
      }

      const updatedTeams = teamsList.map((team) => (
        team.id === activePortal.id ? { ...team, ...updates } : team
      ));
      const updatedPortal = updatedTeams.find((team) => team.id === activePortal.id);

      setTeamsList(updatedTeams);
      if (updatedPortal) {
        setActivePortal(updatedPortal);
      }

      setIsEditingPortal(false);
      showToast('Portal details updated.');
    } catch (error) {
      console.error('[TeamsApp] Failed to update portal details:', error);
      showToast('Failed to update portal details');
    }
  };

  const handleCreatePortal = async () => {
    if (!newPortal.name) return;
    const portal = {
      name: newPortal.name,
      desc: newPortal.desc || 'Ministry team portal',
      lead: newPortal.lead || 'Unassigned',
      members: 0,
      roster: [],
      status: 'unlocked',
      access: 'View Only',
    };

    try {
      const created = await createTeamPortal(portal);
      setTeamsList([...teamsList, created]);
      setIsCreatingPortal(false);
      setNewPortal({ name: '', desc: '', lead: '' });
      showToast(`${portal.name} portal created`);
    } catch (error) {
      console.error('[TeamsApp] Failed to create portal:', error);
      showToast('Failed to create portal');
    }
  };

  const handleEditChatMsg = (msg) => {
    setEditingChatMsgId(msg.id);
    setEditingChatMsgText(msg.text);
    setTimeout(() => editChatInputRef.current?.focus(), 50);
  };

  const handleSaveChatEdit = async () => {
    const text = editingChatMsgText.trim();
    if (!editingChatMsgId || !text) { setEditingChatMsgId(null); return; }
    const teamId = String(activePortal.id);
    const msgId = editingChatMsgId;
    setEditingChatMsgId(null);
    setChatMessagesByTeam(prev => ({
      ...prev,
      [teamId]: (prev[teamId] || []).map(m => m.id === msgId ? { ...m, text, edited: true } : m),
    }));
    try {
      await editTeamMessage(msgId, text);
    } catch {
      showToast('Failed to edit message');
    }
  };

  const handleDeleteChatMsg = async (msgId) => {
    const teamId = String(activePortal.id);
    setChatMessagesByTeam(prev => ({
      ...prev,
      [teamId]: (prev[teamId] || []).filter(m => m.id !== msgId),
    }));
    try {
      await deleteTeamMessage(msgId);
    } catch {
      showToast('Failed to delete message');
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || !activePortal?.id) return;

    const teamId = String(activePortal.id);
    const tempId = `temp-team-chat-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      text,
      from: displayName,
      senderUid: user?.uid || '',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessagesByTeam((prev) => ({
      ...prev,
      [teamId]: [...(prev[teamId] || []), optimisticMessage],
    }));
    setChatInput('');

    try {
      await createTeamMessage({
        teamId,
        teamName: activePortal.name,
        from: displayName,
        senderUid: user?.uid || '',
        text,
      });
      setChatMessagesByTeam((prev) => ({
        ...prev,
        [teamId]: (prev[teamId] || []).filter((message) => message.id !== tempId),
      }));
    } catch (error) {
      console.error('[TeamsApp] Failed to send team message:', error);
      setChatMessagesByTeam((prev) => ({
        ...prev,
        [teamId]: (prev[teamId] || []).filter((message) => message.id !== tempId),
      }));
      showToast('Message failed to send. Please retry.');
    }
  };

  const handleUploadFile = () => { fileInputRef.current?.click(); };

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPortalFiles(prev => [{ id: Date.now(), name: file.name, date: 'Just now' }, ...prev]);
    showToast(`${file.name} uploaded successfully`);
    e.target.value = '';
  };

  if (activePortal) {
    const isPortalLead = Boolean(activePortal.leadUid && activePortal.leadUid === user?.uid);
    const canModerateChat = isAdmin || isPortalLead;

    return (
      <div className="space-y-6 animate-in fade-in duration-500 text-left">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6">
          <div>
            <button onClick={() => setActivePortal(null)} className="text-stone-400 hover:text-stone-600 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1 transition-colors">
              <ChevronRight className="rotate-180" size={14}/> Back to Portals
            </button>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${theme.light} ${theme.color}`}><FolderLock size={24}/></div>
              <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">{activePortal.name}</h1>
              {isAdmin && (
                <button onClick={handleStartPortalEdit} className="mt-1 px-2.5 py-1 text-xs font-semibold rounded-md text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-colors" title="Edit Portal Details">
                  Edit Portal
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-stone-500 text-sm font-medium">Team Lead: {activePortal.lead}</span>
              <span className="text-stone-300">•</span>
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                isAdmin ? 'bg-emerald-100 text-emerald-700'
                : isPortalLead ? 'bg-indigo-100 text-indigo-700'
                : 'bg-amber-100 text-amber-700'
              }`}>
                {isAdmin ? 'Full Admin' : isPortalLead ? 'Portal Director' : 'View Only'}
              </span>
              {isPortalLead && !isAdmin && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                  <ShieldCheck size={10}/> Chat Moderator
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            <button onClick={() => setIsChatOpen(true)} className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}>
              <MessageSquare size={16}/> Team Chat
            </button>
            {activePortal.name === 'Lifegate Music' && (
              <button onClick={() => setActiveApp('music')} className="px-4 py-2 bg-rose-600 text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2 ml-2">
                <Music size={16}/> Open Music App
              </button>
            )}
          </div>
        </div>

        <div className="border-b border-stone-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button onClick={() => setActiveTab('roster')} className={`border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'roster' ? `${theme.border} ${theme.color}` : 'border-transparent text-stone-500 hover:text-stone-700'}`}>Team Roster</button>
            <button onClick={() => setActiveTab('files')}  className={`border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'files'  ? `${theme.border} ${theme.color}` : 'border-transparent text-stone-500 hover:text-stone-700'}`}>Secure Files &amp; Resources</button>
          </nav>
        </div>

        {activeTab === 'files' && (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
              <h3 className="font-semibold text-stone-800">Restricted Team Documents</h3>
              {isAdmin && (
                <>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
                  <button onClick={handleUploadFile} className={`text-sm font-medium ${theme.color} flex items-center gap-1`}><UploadCloud size={14}/> Upload File</button>
                </>
              )}
            </div>
            <div className="divide-y divide-stone-100">
              {portalFiles.map(f => (
                <div key={f.id} className="p-4 flex items-center justify-between hover:bg-stone-50">
                  <div className="flex items-center gap-3">
                    <File className="text-stone-400" size={20}/>
                    <div>
                      <p className="font-medium text-stone-900 text-sm">{f.name}</p>
                      <p className="text-xs text-stone-500">Uploaded {f.date}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {!isAdmin && (
              <div className="p-4 bg-amber-50 border-t border-amber-100 flex items-start gap-3">
                <ShieldAlert className="text-amber-600 shrink-0" size={18}/>
                <p className="text-xs text-amber-800 font-medium">You have &lsquo;View Only&rsquo; access. Contact team lead to request edit permissions.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'roster' && (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
              <h3 className="font-semibold text-stone-800">Active Members ({activePortal.members})</h3>
              {isAdmin && <button onClick={() => setIsAddingMember(!isAddingMember)} className={`text-sm font-medium ${theme.color} flex items-center gap-1`}><UserPlus size={14}/> Add Member</button>}
            </div>
            {isAddingMember && isAdmin && (
              <div className="p-4 border-b border-stone-200 bg-stone-100/50 flex gap-2 items-center">
                <select className="flex-1 p-2 border border-stone-300 rounded text-sm outline-none focus:border-indigo-500" value={memberToAdd} onChange={e => setMemberToAdd(e.target.value)}>
                  <option value="">Select someone from database...</option>
                  {people.map(p => <option key={p.id} value={p.id}>{getPersonDisplayName(p)} ({p.email || 'No email'})</option>)}
                </select>
                <button onClick={handleAddMember} className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-medium">Assign</button>
                <button onClick={() => setIsAddingMember(false)} className="px-4 py-2 bg-stone-200 text-stone-700 rounded text-sm font-medium">Cancel</button>
              </div>
            )}
            <div className="divide-y divide-stone-100">
              {activePortal.roster && activePortal.roster.length > 0
                ? activePortal.roster.map(member => (
                  <div key={member.id} className="p-4 flex items-center justify-between gap-3 hover:bg-stone-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">{resolveMemberName(member).charAt(0)}</div>
                      <span className="font-medium text-stone-900">{resolveMemberName(member)}</span>
                    </div>
                    {isAdmin && (
                      <button onClick={() => handleRemoveMember(member.id)} className="text-stone-300 hover:text-rose-500 transition-colors" title="Remove from roster"><Trash2 size={15}/></button>
                    )}
                  </div>
                )) : (
                  <div className="p-8 text-center">
                    <Users className="mx-auto text-stone-300 mb-3" size={32}/>
                    <p className="text-sm text-stone-500">No members assigned to this roster yet.</p>
                  </div>
                )
              }
            </div>
          </div>
        )}

        {/* Team Chat Modal */}
        {isChatOpen && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200" style={{ height: '90dvh', maxHeight: '600px' }}>
              {/* Header */}
              <div className={`${theme.bg} px-4 py-3 text-white flex justify-between items-center shrink-0`}>
                <div className="flex items-center gap-2">
                  <MessageSquare size={16}/>
                  <div>
                    <p className="font-bold text-sm">{activePortal.name}</p>
                    <p className="text-[10px] opacity-75">{(chatMessagesByTeam[String(activePortal.id)] || []).length} messages · {(activePortal.roster || []).length} members</p>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="text-white/80 hover:text-white rounded-full hover:bg-white/20 p-1"><X size={18}/></button>
              </div>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 bg-stone-50">
                {chatLoading && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-xs text-stone-400 animate-pulse">Loading messages…</div>
                  </div>
                )}
                {!chatLoading && (chatMessagesByTeam[String(activePortal.id)] || []).length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-stone-400">
                    <MessageSquare size={32} className="opacity-30"/>
                    <p className="text-sm">No messages yet. Start the conversation!</p>
                  </div>
                )}
                {!chatLoading && (() => {
                  const msgs = chatMessagesByTeam[String(activePortal.id)] || [];
                  const GROUP_GAP_MS = 5 * 60 * 1000;
                  return msgs.map((msg, idx) => {
                    const isMe = msg.senderUid ? msg.senderUid === user?.uid : msg.from === displayName;
                    const prev = msgs[idx - 1];
                    const isSameGroup = prev &&
                      prev.senderUid === msg.senderUid &&
                      (msg.createdAtMs - prev.createdAtMs) < GROUP_GAP_MS;
                    const next = msgs[idx + 1];
                    const isLastInGroup = !next ||
                      next.senderUid !== msg.senderUid ||
                      (next.createdAtMs - msg.createdAtMs) >= GROUP_GAP_MS;
                    const showDateSep = !prev || prev.dateLabel !== msg.dateLabel;
                    const colorClass = hashColor(msg.from);
                    const canAct = isMe || canModerateChat;
                    const isEditing = editingChatMsgId === msg.id;
                    return (
                      <div key={msg.id} className="group/msg">
                        {showDateSep && msg.dateLabel && (
                          <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-stone-200"/>
                            <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider px-1">{msg.dateLabel}</span>
                            <div className="flex-1 h-px bg-stone-200"/>
                          </div>
                        )}
                        <div className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${isSameGroup ? 'mt-0.5' : 'mt-3'}`}>
                          {!isMe && (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${isLastInGroup ? colorClass : 'invisible'}`}>
                              {getInitials(msg.from)}
                            </div>
                          )}
                          {isMe && <div className="w-8 shrink-0"/>}
                          <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[72%]`}>
                            {!isSameGroup && !isMe && (
                              <p className={`text-[11px] font-semibold mb-1 px-1 ${colorClass.split(' ')[1]}`}>{msg.from}</p>
                            )}
                            {!isSameGroup && isMe && (
                              <p className="text-[11px] font-semibold mb-1 px-1 text-stone-400">{displayName}</p>
                            )}
                            {isEditing ? (
                              <form onSubmit={e => { e.preventDefault(); handleSaveChatEdit(); }} className="flex items-center gap-1 w-full">
                                <input
                                  ref={editChatInputRef}
                                  value={editingChatMsgText}
                                  onChange={e => setEditingChatMsgText(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Escape') setEditingChatMsgId(null); }}
                                  className="flex-1 px-3 py-2 text-sm rounded-xl border-2 border-blue-300 outline-none min-w-[140px] bg-white"
                                  autoFocus
                                />
                                <button type="submit" className="p-1.5 text-blue-500 hover:text-blue-700 rounded-lg hover:bg-blue-50 transition-colors" title="Save"><Save size={13}/></button>
                                <button type="button" onClick={() => setEditingChatMsgId(null)} className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors" title="Cancel"><X size={13}/></button>
                              </form>
                            ) : (
                              <div className={`px-3 py-2 text-sm leading-relaxed break-words ${isMe
                                ? `${theme.bg} text-white ${isLastInGroup ? 'rounded-l-2xl rounded-tr-2xl rounded-br-sm' : 'rounded-2xl'}`
                                : `bg-white text-stone-800 border border-stone-100 shadow-sm ${isLastInGroup ? 'rounded-r-2xl rounded-tl-2xl rounded-bl-sm' : 'rounded-2xl'}`
                              }`}>
                                {msg.text}
                                {msg.edited && <span className="text-[9px] opacity-50 ml-1.5 italic">(edited)</span>}
                              </div>
                            )}
                            {!isEditing && canAct && (
                              <div className={`flex gap-0.5 mt-0.5 opacity-0 group-hover/msg:opacity-100 focus-within:opacity-100 transition-opacity ${isMe ? 'self-end' : 'self-start'}`}>
                                {isMe && (
                                  <button onClick={() => handleEditChatMsg(msg)} className="p-1 text-stone-300 hover:text-stone-600 hover:bg-stone-200 rounded transition-colors" title="Edit message">
                                    <Pencil size={11}/>
                                  </button>
                                )}
                                <button onClick={() => handleDeleteChatMsg(msg.id)} className="p-1 text-stone-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors" title={isMe ? 'Delete message' : 'Remove message'}>
                                  <Trash2 size={11}/>
                                </button>
                              </div>
                            )}
                            {isLastInGroup && !isEditing && (
                              <p className="text-[9px] text-stone-400 mt-0.5 px-1">{msg.time}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
                <div ref={chatBottomRef}/>
              </div>
              {/* Input */}
              <form onSubmit={handleSendChat} className="px-3 py-2.5 border-t border-stone-200 bg-white flex gap-2 items-center shrink-0">
                <input
                  type="text"
                  placeholder={chatLoading ? 'Loading messages…' : `Message ${activePortal.name}…`}
                  className="flex-1 px-4 py-2.5 bg-stone-100 border border-transparent rounded-full text-sm outline-none focus:bg-white focus:border-stone-300 transition-all"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className={`${theme.bg} text-white p-2.5 rounded-full disabled:opacity-40 transition-opacity shrink-0`}
                >
                  <Send size={15}/>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Ministry Portals</h1>
          <p className="text-stone-500 text-sm mt-1">Secure, role-based workspaces restricted by department.</p>
        </div>
        {isAdmin && (
          <button onClick={() => setIsCreatingPortal(true)} className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}>
            <Plus size={16}/> Create New Portal
          </button>
        )}
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 h-4 w-4" />
          <input type="text" placeholder="Search portals..." className="w-full pl-9 pr-4 py-2 border border-stone-200 rounded-md text-sm outline-none focus:border-indigo-500" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map(team => (
          <div key={team.id} className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 flex flex-col relative overflow-hidden group">
            {!isAdmin && team.status === 'locked' && (
              <div className="absolute inset-0 bg-stone-100/60 backdrop-blur-[1px] z-10 flex items-center justify-center flex-col">
                <Lock size={32} className="text-stone-400 mb-2"/>
                <span className="bg-white px-3 py-1 rounded shadow-sm text-xs font-bold text-stone-600 uppercase tracking-wider border border-stone-200">Access Denied</span>
              </div>
            )}
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-lg ${theme.light} ${theme.color}`}><FolderLock size={20}/></div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded ${isAdmin || team.status === 'unlocked' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {isAdmin ? 'Full Admin' : team.access}
              </span>
            </div>
            <h3 className="text-lg font-bold text-stone-900">{team.name}</h3>
            <p className="text-sm text-stone-500 mt-1 flex-1">{team.desc}</p>
            <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
              <div className="flex -space-x-2">
                {[...Array(Math.min(3, team.members))].map((_, i) => (<div key={i} className="w-6 h-6 rounded-full bg-stone-200 border-2 border-white"></div>))}
                {team.members > 3 && (<div className="w-6 h-6 rounded-full bg-stone-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-stone-500">+{team.members - 3}</div>)}
              </div>
              <button
                onClick={() => { if (isAdmin || team.status !== 'locked') { setActivePortal(team); } }}
                className={`text-sm font-semibold flex items-center gap-1 transition-colors ${!isAdmin && team.status === 'locked' ? 'text-stone-300 cursor-not-allowed' : `${theme.color} hover:opacity-80`}`}
              >
                Enter Portal <ChevronRight size={16}/>
              </button>
            </div>
          </div>
        ))}
      </div>

      {isCreatingPortal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2"><FolderLock className={theme.color}/> New Ministry Portal</h2>
              <button onClick={() => setIsCreatingPortal(false)} className="text-stone-400 hover:text-stone-600"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="Portal Name (e.g. Worship Team)" className="w-full p-2 border border-stone-200 rounded-md text-sm outline-none focus:border-indigo-500" value={newPortal.name} onChange={e => setNewPortal({ ...newPortal, name: e.target.value })} />
              <input type="text" placeholder="Description" className="w-full p-2 border border-stone-200 rounded-md text-sm outline-none focus:border-indigo-500" value={newPortal.desc} onChange={e => setNewPortal({ ...newPortal, desc: e.target.value })} />
              <input type="text" placeholder="Team Lead Name" className="w-full p-2 border border-stone-200 rounded-md text-sm outline-none focus:border-indigo-500" value={newPortal.lead} onChange={e => setNewPortal({ ...newPortal, lead: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsCreatingPortal(false)} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-md font-medium text-sm">Cancel</button>
              <button onClick={handleCreatePortal} className={`px-4 py-2 ${theme.bg} text-white rounded-md font-medium text-sm hover:opacity-90`}>Create Portal</button>
            </div>
          </div>
        </div>
      )}

      {isEditingPortal && isAdmin && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2"><FolderLock className={theme.color}/> Edit Ministry Portal</h2>
              <button onClick={() => setIsEditingPortal(false)} className="text-stone-400 hover:text-stone-600"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="Portal Name" className="w-full p-2 border border-stone-200 rounded-md text-sm outline-none focus:border-indigo-500" value={editingPortal.name} onChange={e => setEditingPortal({ ...editingPortal, name: e.target.value })} />
              <input type="text" placeholder="Description" className="w-full p-2 border border-stone-200 rounded-md text-sm outline-none focus:border-indigo-500" value={editingPortal.desc} onChange={e => setEditingPortal({ ...editingPortal, desc: e.target.value })} />
              <input type="text" placeholder="Team Lead Name" className="w-full p-2 border border-stone-200 rounded-md text-sm outline-none focus:border-indigo-500" value={editingPortal.lead} onChange={e => setEditingPortal({ ...editingPortal, lead: e.target.value })} />
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">Assign Portal Director (chat moderator)</label>
                <select
                  className="w-full p-2 border border-stone-200 rounded-md text-sm outline-none focus:border-indigo-500 bg-white"
                  value={editingPortal.leadUid || ''}
                  onChange={e => {
                    const selected = userProfiles.find(u => u.uid === e.target.value);
                    setEditingPortal(prev => ({
                      ...prev,
                      leadUid: e.target.value,
                      lead: selected ? (selected.displayName || prev.lead) : prev.lead,
                    }));
                  }}
                >
                  <option value="">— No director assigned —</option>
                  {userProfiles.map(u => (
                    <option key={u.uid} value={u.uid}>{u.displayName || u.email} ({u.email})</option>
                  ))}
                </select>
                <p className="text-[10px] text-stone-400 mt-1 flex items-center gap-1"><ShieldCheck size={10}/> The assigned director can delete inappropriate messages in this portal's chat.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsEditingPortal(false)} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-md font-medium text-sm">Cancel</button>
              <button onClick={handleSavePortalEdit} className={`px-4 py-2 ${theme.bg} text-white rounded-md font-medium text-sm hover:opacity-90 flex items-center gap-2`}><Save size={14}/> Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
