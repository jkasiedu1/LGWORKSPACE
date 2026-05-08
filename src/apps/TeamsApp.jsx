import { useRef, useState, useEffect } from 'react';
import {
  FolderLock, ChevronRight, MessageSquare, Music, UserPlus,
  UploadCloud, File, ShieldAlert, Users, Lock, Plus, Search, X, Send, Pencil, Save, Trash2
} from 'lucide-react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { createTeamMessage, createTeamPortal, updateTeamPortal } from '../lib/firestoreServices';
import { db } from '../config/firebase';

export default function TeamsApp({ theme, teamsList, setTeamsList, people, setActiveApp, isAdmin, showToast, globalSearch }) {
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
  const [portalFiles, setPortalFiles] = useState([{ id: 1, name: 'Q1 Volunteer Handbook.pdf', date: '2 days ago' }]);
  const fileInputRef = useRef(null);

  useEffect(() => { if (globalSearch !== undefined) setSearchQuery(globalSearch); }, [globalSearch]);

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
            from: data.from || 'Team Lead',
            time: createdAt
              ? createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : data.time || 'Now',
          };
        });
        setChatMessagesByTeam((prev) => ({ ...prev, [teamId]: messages }));
        setChatLoading(false);
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
    });
    setIsEditingPortal(true);
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

  const handleSendChat = async (e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || !activePortal?.id) return;

    const teamId = String(activePortal.id);
    const tempId = `temp-team-chat-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      text,
      from: 'You',
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
        from: 'You',
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
    return (
      <div className="space-y-6 animate-in fade-in duration-500 text-left">
        <div className="flex justify-between items-end mb-6">
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
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isAdmin ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                Your Access: {isAdmin ? 'Full Admin' : 'View Only'}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
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
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200" style={{ height: '480px' }}>
              <div className={`${theme.bg} p-4 text-white flex justify-between items-center`}>
                <h2 className="font-bold flex items-center gap-2"><MessageSquare size={18}/> {activePortal.name} — Team Chat</h2>
                <button onClick={() => setIsChatOpen(false)} className="text-white/80 hover:text-white"><X size={18}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50">
                {(chatMessagesByTeam[String(activePortal.id)] || []).map(msg => (
                  <div key={msg.id} className={`flex flex-col ${msg.from === 'You' ? 'items-end' : 'items-start'}`}>
                    <p className="text-[10px] text-stone-400 mb-0.5">{msg.from} · {msg.time}</p>
                    <div className={`px-3 py-2 rounded-xl text-sm max-w-[80%] ${msg.from === 'You' ? 'bg-indigo-600 text-white' : 'bg-white text-stone-800 border border-stone-200'}`}>{msg.text}</div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendChat} className="p-3 border-t border-stone-200 bg-white flex gap-2">
                <input type="text" placeholder={chatLoading ? 'Loading messages...' : 'Message the team…'} className="flex-1 p-2 border border-stone-300 rounded-md text-sm outline-none focus:border-indigo-500" value={chatInput} onChange={e => setChatInput(e.target.value)} />
                <button type="submit" className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"><Send size={16}/></button>
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
