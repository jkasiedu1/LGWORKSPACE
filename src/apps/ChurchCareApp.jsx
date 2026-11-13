import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Archive,
  CalendarClock,
  Check,
  ChevronRight,
  Clock3,
  Heart,
  Mail,
  MessageSquareText,
  Phone,
  Plus,
  RotateCcw,
  Search,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import {
  addChurchCareNote,
  createChurchCareVisitor,
  moveChurchCareVisitorToDirectory,
  recordChurchCareFollowUp,
  setChurchCareArchived,
  subscribeToChurchCareActivities,
  updateChurchCareFollowUpDate,
  updateChurchCareStage,
} from '../lib/churchCareServices';

const STAGES = [
  { value: 'new', label: 'New visitor' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'connected', label: 'Connected' },
  { value: 'ready-to-join', label: 'Decided to join' },
];

const FILTERS = [
  { id: 'follow-up', label: 'Follow-ups' },
  { id: 'active', label: 'Active visitors' },
  { id: 'ready', label: 'Ready to join' },
  { id: 'history', label: 'Past records' },
];

function localDateValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function toDate(value) {
  if (!value) return null;
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function displayDate(value) {
  const date = toDate(value);
  return date ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not scheduled';
}

function getDueStatus(value) {
  const due = toDate(value);
  if (!due) return null;
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  if (due < new Date(new Date().setHours(0, 0, 0, 0))) return 'Overdue';
  if (due <= todayEnd) return 'Due today';
  return 'Upcoming';
}

function getPersonName(person) {
  return `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Unnamed visitor';
}

function StatCard({ icon: Icon, label, value, tone = 'stone' }) {
  const tones = {
    stone: 'bg-stone-50 text-stone-600',
    teal: 'bg-teal-50 text-teal-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className={`mb-3 inline-flex rounded-lg p-2 ${tones[tone]}`}>
        <Icon size={17} />
      </div>
      <div className="text-2xl font-bold text-stone-900">{value}</div>
      <div className="mt-1 text-xs font-medium text-stone-500">{label}</div>
    </div>
  );
}

function VisitorForm({ onClose, onSave, saving }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    firstVisitDate: localDateValue(),
    contactConsent: false,
  });
  const [error, setError] = useState('');
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    if (!firstName || !lastName) {
      setError('First and last name are required.');
      return;
    }
    if (!email && !phone) {
      setError('Add an email address or phone number.');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }

    try {
      await onSave({
        firstName,
        lastName,
        email,
        phone,
        firstVisitDate: form.firstVisitDate,
        contactConsent: form.contactConsent,
      });
    } catch (saveError) {
      setError(saveError.message || 'Could not add this visitor.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4" onMouseDown={onClose}>
      <form
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Add a visitor</h2>
            <p className="mt-1 text-sm text-stone-500">This record stays separate from the church directory.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-stone-600">
            First name
            <input autoFocus value={form.firstName} onChange={(event) => setField('firstName', event.target.value)} className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-normal text-stone-900 outline-none focus:border-teal-500" />
          </label>
          <label className="text-xs font-semibold text-stone-600">
            Last name
            <input value={form.lastName} onChange={(event) => setField('lastName', event.target.value)} className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-normal text-stone-900 outline-none focus:border-teal-500" />
          </label>
          <label className="text-xs font-semibold text-stone-600">
            Phone
            <input type="tel" value={form.phone} onChange={(event) => setField('phone', event.target.value)} className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-normal text-stone-900 outline-none focus:border-teal-500" />
          </label>
          <label className="text-xs font-semibold text-stone-600">
            Email
            <input type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-normal text-stone-900 outline-none focus:border-teal-500" />
          </label>
          <label className="text-xs font-semibold text-stone-600 sm:col-span-2">
            First visit
            <input type="date" value={form.firstVisitDate} onChange={(event) => setField('firstVisitDate', event.target.value)} className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-normal text-stone-900 outline-none focus:border-teal-500" />
          </label>
        </div>
        <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-lg bg-stone-50 p-3 text-sm text-stone-700">
          <input type="checkbox" checked={form.contactConsent} onChange={(event) => setField('contactConsent', event.target.checked)} className="mt-0.5 accent-teal-600" />
          <span>
            They agreed to be contacted.
            <span className="mt-0.5 block text-xs text-stone-500">A first follow-up reminder will be scheduled only when this is checked.</span>
          </span>
        </label>
        {error && <p className="mt-3 flex items-center gap-2 text-sm text-rose-600"><AlertCircle size={15} />{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-100">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50">
            {saving ? 'Saving…' : 'Add visitor'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ChurchCareApp({ isAdmin, isSeniorPastor, globalSearch = '', showToast }) {
  const { user } = useAuth();
  const [visitors, setVisitors] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedVisitorId, setSelectedVisitorId] = useState('');
  const [filter, setFilter] = useState('follow-up');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [dueDateDraft, setDueDateDraft] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const canMoveToDirectory = isAdmin || isSeniorPastor;
  const actor = { uid: user?.uid || '', email: user?.email || '' };

  useEffect(() => {
    if (!db) {
      setLoading(false);
      setLoadError('Church Care is unavailable because the database is not configured.');
      return undefined;
    }
    return onSnapshot(
      collection(db, 'churchCareVisitors'),
      (snapshot) => {
        setVisitors(snapshot.docs.map((visitorDoc) => ({ id: visitorDoc.id, ...visitorDoc.data() })));
        setLoading(false);
        setLoadError('');
      },
      (error) => {
        console.error('[ChurchCareApp] Visitor subscription failed:', error);
        setLoading(false);
        setLoadError('Could not load Church Care records. Check your access and try again.');
      }
    );
  }, []);

  const searchTerm = (search || globalSearch).trim().toLowerCase();
  const activeVisitors = useMemo(() => visitors.filter((visitor) => visitor.status === 'active'), [visitors]);
  const dueVisitors = useMemo(() => activeVisitors.filter((visitor) => {
    const due = toDate(visitor.nextFollowUpAt);
    return due && due <= new Date(new Date().setHours(23, 59, 59, 999));
  }), [activeVisitors]);
  const newVisitors = useMemo(() => activeVisitors.filter((visitor) => visitor.stage === 'new'), [activeVisitors]);

  const visibleVisitors = useMemo(() => {
    let result = visitors;
    if (filter === 'follow-up') result = dueVisitors;
    if (filter === 'active') result = activeVisitors;
    if (filter === 'ready') result = activeVisitors.filter((visitor) => visitor.stage === 'ready-to-join');
    if (filter === 'history') result = visitors.filter((visitor) => visitor.status === 'archived' || visitor.status === 'converted');
    if (searchTerm) {
      result = result.filter((visitor) => (
        `${visitor.firstName || ''} ${visitor.lastName || ''} ${visitor.email || ''} ${visitor.phone || ''}`
          .toLowerCase()
          .includes(searchTerm)
      ));
    }
    return [...result].sort((a, b) => {
      const aDue = toDate(a.nextFollowUpAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bDue = toDate(b.nextFollowUpAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aDue - bDue || getPersonName(a).localeCompare(getPersonName(b));
    });
  }, [visitors, dueVisitors, activeVisitors, filter, searchTerm]);

  const selectedVisitor = visibleVisitors.find((visitor) => visitor.id === selectedVisitorId) || null;

  useEffect(() => {
    if (!visibleVisitors.some((visitor) => visitor.id === selectedVisitorId)) {
      setSelectedVisitorId(visibleVisitors[0]?.id || '');
    }
  }, [visibleVisitors, selectedVisitorId]);

  useEffect(() => {
    setActivities([]);
    if (!selectedVisitorId || !db) return undefined;
    return subscribeToChurchCareActivities(
      selectedVisitorId,
      setActivities,
      (error) => {
        console.error('[ChurchCareApp] Activity subscription failed:', error);
        showToast('Could not load this visitor’s care history.');
      }
    );
  }, [selectedVisitorId, showToast]);

  useEffect(() => {
    setDueDateDraft(selectedVisitor?.nextFollowUpAt ? localDateValue(toDate(selectedVisitor.nextFollowUpAt)) : '');
    setFollowUpNote('');
  }, [selectedVisitorId, selectedVisitor?.nextFollowUpAt]);

  const handleCreateVisitor = async (visitor) => {
    setSaving(true);
    try {
      const created = await createChurchCareVisitor(visitor, actor);
      if (!db) setVisitors((current) => [{ ...created, id: created.id }, ...current]);
      setSelectedVisitorId(created.id);
      setShowCreate(false);
      showToast(visitor.contactConsent ? 'Visitor added. First follow-up is scheduled.' : 'Visitor added.');
    } catch (error) {
      console.error('[ChurchCareApp] Failed to create visitor:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleStageChange = async (stage) => {
    if (!selectedVisitor) return;
    try {
      await updateChurchCareStage(selectedVisitor.id, stage, actor);
      showToast('Care stage updated.');
    } catch (error) {
      console.error('[ChurchCareApp] Failed to update care stage:', error);
      showToast(error.message || 'Could not update the care stage.');
    }
  };

  const handleFollowUp = async () => {
    if (!selectedVisitor || !followUpNote.trim()) return;
    setSaving(true);
    try {
      await recordChurchCareFollowUp(selectedVisitor.id, followUpNote, actor);
      setFollowUpNote('');
      showToast('Follow-up logged. The next reminder was scheduled.');
    } catch (error) {
      console.error('[ChurchCareApp] Failed to log follow-up:', error);
      showToast(error.message || 'Could not log the follow-up.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!selectedVisitor || !noteDraft.trim()) return;
    setSaving(true);
    try {
      await addChurchCareNote(selectedVisitor.id, noteDraft, actor);
      setNoteDraft('');
      showToast('Note added.');
    } catch (error) {
      console.error('[ChurchCareApp] Failed to add care note:', error);
      showToast('Could not add this note.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDueDate = async () => {
    if (!selectedVisitor) return;
    setSaving(true);
    try {
      await updateChurchCareFollowUpDate(selectedVisitor.id, dueDateDraft, actor);
      showToast(dueDateDraft ? 'Follow-up date updated.' : 'Follow-up reminder removed.');
    } catch (error) {
      console.error('[ChurchCareApp] Failed to update follow-up date:', error);
      showToast('Could not update the follow-up date.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!selectedVisitor) return;
    const archived = selectedVisitor.status === 'active';
    try {
      await setChurchCareArchived(selectedVisitor.id, archived, actor);
      showToast(archived ? 'Visitor record archived.' : 'Visitor record restored.');
    } catch (error) {
      console.error('[ChurchCareApp] Failed to update record status:', error);
      showToast('Could not update this visitor record.');
    }
  };

  const handleMoveToDirectory = async () => {
    if (!selectedVisitor || !canMoveToDirectory) return;
    const name = getPersonName(selectedVisitor);
    const confirmed = window.confirm(`Move ${name} to the church directory as a member? Only continue if they have decided to join.`);
    if (!confirmed) return;
    setSaving(true);
    try {
      await moveChurchCareVisitorToDirectory(selectedVisitor.id, actor);
      showToast(`${name} was moved to the church directory.`);
    } catch (error) {
      console.error('[ChurchCareApp] Failed to move visitor to directory:', error);
      showToast(error.message || 'Could not move this visitor to the directory.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0 space-y-5 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
            <Heart size={13} /> Care, not sales
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Church Care</h1>
          <p className="mt-1 max-w-2xl text-sm text-stone-500">Keep visitor follow-ups organized. Records stay separate until someone decides to join. Reminders appear here; the app does not send texts or emails automatically.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-stone-800">
          <Plus size={16} /> Add visitor
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={UsersRound} label="Active visitors" value={activeVisitors.length} />
        <StatCard icon={UserRound} label="New visitors to welcome" value={newVisitors.length} tone="teal" />
        <StatCard icon={Clock3} label="Follow-ups due" value={dueVisitors.length} tone="amber" />
      </div>

      {loadError && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      <div className="grid min-h-[520px] gap-4 lg:grid-cols-[minmax(300px,0.82fr)_minmax(0,1.18fr)]">
        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <div className="border-b border-stone-100 p-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search visitors" className="w-full rounded-lg border border-stone-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-500" />
            </div>
            <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
              {FILTERS.map((item) => (
                <button key={item.id} onClick={() => setFilter(item.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${filter === item.id ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[680px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-sm text-stone-500">Loading care records…</div>
            ) : visibleVisitors.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 text-stone-500"><UsersRound size={20} /></div>
                <p className="text-sm font-semibold text-stone-800">{filter === 'follow-up' ? 'You’re all caught up' : 'No visitors found'}</p>
                <p className="mt-1 text-xs text-stone-500">{filter === 'follow-up' ? 'No follow-ups are due right now.' : 'Add a visitor or try another search.'}</p>
              </div>
            ) : visibleVisitors.map((visitor) => {
              const dueStatus = getDueStatus(visitor.nextFollowUpAt);
              const selected = visitor.id === selectedVisitorId;
              return (
                <button
                  type="button"
                  key={visitor.id}
                  onClick={() => setSelectedVisitorId(visitor.id)}
                  className={`flex w-full items-start gap-3 border-b border-stone-100 p-4 text-left transition-colors hover:bg-stone-50 ${selected ? 'bg-teal-50/60' : ''}`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-800">
                    {(visitor.firstName?.[0] || '?').toUpperCase()}{(visitor.lastName?.[0] || '').toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-stone-900">{getPersonName(visitor)}</span>
                      <ChevronRight size={15} className="shrink-0 text-stone-400" />
                    </div>
                    <div className="mt-1 truncate text-xs text-stone-500">{visitor.phone || visitor.email || 'No contact details'}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600">
                        {STAGES.find((stage) => stage.value === visitor.stage)?.label || 'New visitor'}
                      </span>
                      {dueStatus && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${dueStatus === 'Overdue' ? 'bg-rose-100 text-rose-700' : dueStatus === 'Due today' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-500'}`}>
                          {dueStatus}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-stone-200 bg-white">
          {!selectedVisitor ? (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center p-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700"><Heart size={21} /></div>
              <p className="text-sm font-semibold text-stone-800">Choose a visitor</p>
              <p className="mt-1 max-w-xs text-xs text-stone-500">Select a record to see the care history, update the next step, or log a follow-up.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              <div className="p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-100 text-base font-bold text-teal-800">
                      {(selectedVisitor.firstName?.[0] || '?').toUpperCase()}{(selectedVisitor.lastName?.[0] || '').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold text-stone-900">{getPersonName(selectedVisitor)}</h2>
                      <p className="mt-0.5 text-xs text-stone-500">First visit {displayDate(selectedVisitor.firstVisitDate)}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedVisitor.contactConsent ? (
                          <>
                            {selectedVisitor.phone && <a href={`tel:${selectedVisitor.phone}`} className="inline-flex items-center gap-1 rounded-md border border-stone-200 px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"><Phone size={12} /> Call</a>}
                            {selectedVisitor.email && <a href={`mailto:${selectedVisitor.email}`} className="inline-flex items-center gap-1 rounded-md border border-stone-200 px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"><Mail size={12} /> Email</a>}
                          </>
                        ) : (
                          <span className="rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-800">No contact permission recorded</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedVisitor.status === 'active' && selectedVisitor.stage === 'ready-to-join' && canMoveToDirectory && (
                      <button disabled={saving} onClick={handleMoveToDirectory} className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50">
                        Move to directory
                      </button>
                    )}
                    {selectedVisitor.status !== 'converted' && (
                      <button disabled={saving} onClick={handleArchive} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-50">
                        {selectedVisitor.status === 'archived' ? <RotateCcw size={13} /> : <Archive size={13} />}
                        {selectedVisitor.status === 'archived' ? 'Restore' : 'Archive'}
                      </button>
                    )}
                  </div>
                </div>
                {selectedVisitor.status === 'converted' && (
                  <p className="mt-4 rounded-lg bg-teal-50 p-3 text-xs font-medium text-teal-800">
                    This person was moved to the church directory as a member. Their Church Care history remains here.
                  </p>
                )}
              </div>

              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <label className="text-xs font-semibold text-stone-600">
                  Care stage
                  <select
                    disabled={selectedVisitor.status !== 'active'}
                    value={selectedVisitor.stage || 'new'}
                    onChange={(event) => handleStageChange(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm font-medium text-stone-800 outline-none focus:border-teal-500 disabled:bg-stone-50"
                  >
                    {STAGES.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
                  </select>
                </label>
                <div>
                  <label className="text-xs font-semibold text-stone-600" htmlFor="care-next-follow-up">Next follow-up</label>
                  <div className="mt-1.5 flex gap-2">
                    <input id="care-next-follow-up" type="date" value={dueDateDraft} disabled={selectedVisitor.status !== 'active' || !selectedVisitor.contactConsent} onChange={(event) => setDueDateDraft(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-stone-200 px-2.5 py-2 text-sm outline-none focus:border-teal-500 disabled:bg-stone-50" />
                    <button disabled={saving || selectedVisitor.status !== 'active' || !selectedVisitor.contactConsent} onClick={handleSaveDueDate} className="rounded-lg border border-stone-200 px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50">Save</button>
                  </div>
                  {!selectedVisitor.contactConsent && <p className="mt-1.5 text-[11px] text-stone-500">No reminder is scheduled because contact permission was not recorded.</p>}
                </div>
              </div>

              {selectedVisitor.status === 'active' && selectedVisitor.contactConsent && (
                <div className="p-5">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-800"><Check size={16} className="text-teal-700" /> Log a follow-up</div>
                  <p className="mb-3 text-xs text-stone-500">
                    {selectedVisitor.followUpStep >= 3
                      ? 'The welcome sequence is complete. You can set another reminder above.'
                      : 'Logging a follow-up automatically schedules the next reminder in the welcome sequence.'}
                  </p>
                  <textarea value={followUpNote} onChange={(event) => setFollowUpNote(event.target.value)} rows={2} placeholder="How did you connect? Add a brief note…" className="w-full resize-y rounded-lg border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500" />
                  <div className="mt-2 flex justify-end">
                    <button disabled={saving || !followUpNote.trim()} onClick={handleFollowUp} className="rounded-lg bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50">
                      {saving ? 'Saving…' : 'Log & schedule next'}
                    </button>
                  </div>
                </div>
              )}

              {selectedVisitor.status === 'active' && (
                <div className="p-5">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-800"><MessageSquareText size={16} className="text-stone-500" /> Add a care note</div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleAddNote(); } }} placeholder="Add a note for the care team…" className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500" />
                    <button disabled={saving || !noteDraft.trim()} onClick={handleAddNote} className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50">Add note</button>
                  </div>
                </div>
              )}

              <div className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-800"><CalendarClock size={16} className="text-stone-500" /> Care history</h3>
                  {selectedVisitor.createdAt && <span className="text-[11px] text-stone-400">Added {displayDate(selectedVisitor.createdAt)}</span>}
                </div>
                {activities.length === 0 ? (
                  <p className="py-3 text-xs text-stone-500">No care activity recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex gap-3">
                        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                            <span className="text-xs font-semibold capitalize text-stone-800">{String(activity.type || 'note').replaceAll('_', ' ')}</span>
                            <span className="text-[10px] text-stone-400">{displayDate(activity.createdAt)}{activity.actorEmail ? ` · ${activity.actorEmail}` : ''}</span>
                          </div>
                          {activity.note && <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-stone-600">{activity.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {showCreate && <VisitorForm onClose={() => setShowCreate(false)} onSave={handleCreateVisitor} saving={saving} />}
    </div>
  );
}
