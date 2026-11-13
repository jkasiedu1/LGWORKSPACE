import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Archive,
  CalendarClock,
  Check,
  Clipboard,
  ChevronRight,
  Clock3,
  Heart,
  Mail,
  MessageSquareText,
  Phone,
  Pencil,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  Send,
  Smartphone,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import {
  addChurchCareNote,
  assignChurchCareTeamMember,
  approveChurchCareGuestIntakeSubmission,
  createChurchCareVisitor,
  moveChurchCareVisitorToDirectory,
  rejectChurchCareGuestIntakeSubmission,
  recordChurchCareFollowUp,
  recordChurchCareTextMarkedSent,
  saveChurchCareMessageTemplate,
  setChurchCareArchived,
  subscribeToChurchCareActivities,
  subscribeToChurchCareGuestIntakeSubmissions,
  subscribeToChurchCareMessageTemplates,
  updateChurchCareFollowUpDate,
  updateChurchCareStage,
  updateChurchCareVisitor,
} from '../lib/churchCareServices';

const STAGES = [
  { value: 'new', label: 'New visitor' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'connected', label: 'Connected' },
  { value: 'ready-to-join', label: 'Decided to join' },
];
const GUEST_AGE_BRACKETS = ['Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+', 'Prefer not to say'];
const CHILD_AGE_BRACKETS = ['Under 5', '5-12', '13-17'];

const DEFAULT_MESSAGE_TEMPLATES = {
  new: 'Hi {firstName}, thanks for visiting Lifegate! We’re glad you joined us. Is there anything we can pray for or help you with?',
  contacted: 'Hi {firstName}, it was great connecting with you. We’d love to help you find your next step at Lifegate. What questions can we answer?',
  connected: 'Hi {firstName}, we’re grateful you’ve been connecting with Lifegate. Let us know how we can support you and help you feel at home.',
  'ready-to-join': 'Hi {firstName}, we’re excited you’re considering becoming part of Lifegate! We’d be glad to talk through membership and next steps.',
};

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
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const dateOnly = new Date(`${value}T00:00:00`);
    return Number.isNaN(dateOnly.getTime()) ? null : dateOnly;
  }
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

function getPersonalizedText(visitor, template) {
  const firstName = String(visitor.firstName || 'there').trim();
  const fullName = getPersonName(visitor);
  const body = String(template || '')
    .replaceAll('{firstName}', firstName)
    .replaceAll('{name}', fullName)
    .trim();
  const message = `${body}\n\n— Lifegate Follow-up Team`;
  if (message.length > 900) {
    throw new Error('This personalized message is too long. Shorten the template and try again.');
  }
  return message;
}

function getTemplatePreview(template) {
  try {
    return getPersonalizedText({ firstName: 'Jordan', lastName: 'Guest' }, template);
  } catch (error) {
    return error.message || 'Shorten the template to preview the personalized message.';
  }
}

function getSmsHref(visitor, message) {
  const rawPhone = String(visitor.phone || '').trim();
  const phone = `${rawPhone.startsWith('+') ? '+' : ''}${rawPhone.replace(/\D/g, '')}`;
  if (!phone) return '';
  return `sms:${phone}?body=${encodeURIComponent(message)}`;
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

function VisitorEditForm({ visitor, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    firstName: visitor.firstName || '',
    lastName: visitor.lastName || '',
    email: visitor.email || '',
    phone: visitor.phone || '',
    firstVisitDate: visitor.firstVisitDate || '',
    gender: visitor.gender || '',
    ageBracket: visitor.ageBracket || '',
    invitedBy: visitor.invitedBy || '',
    prayerRequest: visitor.prayerRequest || '',
    childAgeBrackets: Array.isArray(visitor.childAgeBrackets) ? visitor.childAgeBrackets : [],
    contactConsent: Boolean(visitor.contactConsent),
  });
  const [error, setError] = useState('');
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const setChildCount = (value) => {
    const count = Number(value);
    setForm((current) => ({
      ...current,
      childAgeBrackets: Array.from(
        { length: count },
        (_, index) => current.childAgeBrackets[index] || ''
      ),
    }));
  };
  const setChildAge = (index, age) => {
    setForm((current) => ({
      ...current,
      childAgeBrackets: current.childAgeBrackets.map((currentAge, childIndex) => (
        childIndex === index ? age : currentAge
      )),
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await onSave({
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
    } catch (saveError) {
      setError(saveError.message || 'Could not update this visitor.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4" onMouseDown={onClose}>
      <form onSubmit={submit} onMouseDown={(event) => event.stopPropagation()} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Edit visitor information</h2>
            <p className="mt-1 text-sm text-stone-500">Changes are saved to Church Care only.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-stone-600">First name
            <input autoFocus value={form.firstName} onChange={(event) => setField('firstName', event.target.value)} className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-normal text-stone-900 outline-none focus:border-teal-500" />
          </label>
          <label className="text-xs font-semibold text-stone-600">Last name
            <input value={form.lastName} onChange={(event) => setField('lastName', event.target.value)} className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-normal text-stone-900 outline-none focus:border-teal-500" />
          </label>
          <label className="text-xs font-semibold text-stone-600">Phone
            <input type="tel" value={form.phone} onChange={(event) => setField('phone', event.target.value)} className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-normal text-stone-900 outline-none focus:border-teal-500" />
          </label>
          <label className="text-xs font-semibold text-stone-600">Email
            <input type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-normal text-stone-900 outline-none focus:border-teal-500" />
          </label>
          <label className="text-xs font-semibold text-stone-600 sm:col-span-2">First visit
            <input type="date" value={form.firstVisitDate} onChange={(event) => setField('firstVisitDate', event.target.value)} className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-normal text-stone-900 outline-none focus:border-teal-500" />
          </label>
          <label className="text-xs font-semibold text-stone-600">Age bracket
            <select value={form.ageBracket} onChange={(event) => setField('ageBracket', event.target.value)} className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm font-normal text-stone-900 outline-none focus:border-teal-500">
              <option value="">Not provided</option>
              {GUEST_AGE_BRACKETS.map((age) => <option key={age} value={age}>{age}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-stone-600">Gender
            <select value={form.gender} onChange={(event) => setField('gender', event.target.value)} className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm font-normal text-stone-900 outline-none focus:border-teal-500">
              <option value="">Not provided</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-stone-600 sm:col-span-2">Who invited them?
            <input maxLength={120} value={form.invitedBy} onChange={(event) => setField('invitedBy', event.target.value)} className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-normal text-stone-900 outline-none focus:border-teal-500" />
          </label>
        </div>
        <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <label className="text-xs font-semibold text-stone-600">Number of children
            <select value={form.childAgeBrackets.length} onChange={(event) => setChildCount(event.target.value)} className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm font-normal text-stone-900 outline-none focus:border-teal-500">
              {Array.from({ length: 11 }, (_, count) => <option key={count} value={count}>{count}</option>)}
            </select>
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {form.childAgeBrackets.map((age, index) => (
              <label key={`edit-child-${index}`} className="text-xs font-semibold text-stone-600">Child {index + 1} age bracket
                <select required value={age} onChange={(event) => setChildAge(index, event.target.value)} className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm font-normal text-stone-900 outline-none focus:border-teal-500">
                  <option value="">Select age bracket</option>
                  {CHILD_AGE_BRACKETS.map((childAge) => <option key={childAge} value={childAge}>{childAge}</option>)}
                </select>
              </label>
            ))}
          </div>
        </div>
        <label className="mt-4 block text-xs font-semibold text-stone-600">Prayer request
          <textarea maxLength={1000} rows={3} value={form.prayerRequest} onChange={(event) => setField('prayerRequest', event.target.value)} className="mt-1.5 w-full resize-y rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-normal text-stone-900 outline-none focus:border-teal-500" />
        </label>
        <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-lg bg-stone-50 p-3 text-sm text-stone-700">
          <input type="checkbox" checked={form.contactConsent} onChange={(event) => setField('contactConsent', event.target.checked)} className="mt-0.5 accent-teal-600" />
          <span>They agreed to be contacted.
            <span className="mt-0.5 block text-xs text-stone-500">Removing permission will also clear the scheduled follow-up reminder.</span>
          </span>
        </label>
        {error && <p className="mt-3 flex items-center gap-2 text-sm text-rose-600"><AlertCircle size={15} />{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-100">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

function TextBatchModal({
  visitor,
  position,
  total,
  message,
  messageError,
  smsHref,
  opened,
  error,
  saving,
  onOpenText,
  onMarkSent,
  onSkip,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4" onMouseDown={onClose}>
      <div onMouseDown={(event) => event.stopPropagation()} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Individual text {position} of {total}</p>
            <h2 className="mt-1 text-lg font-bold text-stone-900">{visitor ? getPersonName(visitor) : 'Guest is no longer eligible'}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {visitor ? (
          <>
            <p className="mb-3 text-xs text-stone-500">{visitor.phone} · {STAGES.find((stage) => stage.value === visitor.stage)?.label || 'Visitor'}</p>
            <div className="whitespace-pre-wrap rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm leading-relaxed text-stone-800">
              {messageError || message}
            </div>
            {messageError ? (
              <p className="mt-3 text-xs text-rose-700">{messageError}</p>
            ) : (
              <p className="mt-3 text-xs text-stone-500">The text opens in your phone’s messaging app. Review it and tap Send there. The app cannot detect whether it was sent.</p>
            )}
            {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
            <div className="mt-5 flex flex-wrap justify-between gap-2">
              <button type="button" onClick={onSkip} className="rounded-lg px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100">
                Skip this guest
              </button>
              <div className="flex flex-wrap gap-2">
                {smsHref && !messageError && (
                  <a
                    href={smsHref}
                    onClick={() => onOpenText(String(visitor.id))}
                    className="inline-flex items-center gap-2 rounded-lg border border-teal-700 px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-50"
                  >
                    <Smartphone size={14} /> Open in Messages
                  </a>
                )}
                <button
                  type="button"
                  disabled={saving || !opened || Boolean(messageError)}
                  onClick={onMarkSent}
                  className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
                >
                  <Check size={14} /> {saving ? 'Saving…' : 'I sent it · Next'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div>
            <p className="text-sm text-stone-600">This guest may have been archived, converted, or had contact permission removed.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100">Close batch</button>
              <button type="button" onClick={onSkip} className="rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white hover:bg-stone-800">Next guest</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChurchCareApp({ isAdmin, isSeniorPastor, people = [], loadingPeople = false, globalSearch = '', showToast }) {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('care');
  const [visitors, setVisitors] = useState([]);
  const [intakeSubmissions, setIntakeSubmissions] = useState([]);
  const [intakeLoading, setIntakeLoading] = useState(true);
  const [intakeError, setIntakeError] = useState('');
  const [reviewingSubmissionId, setReviewingSubmissionId] = useState('');
  const [isIntakeQrOpen, setIsIntakeQrOpen] = useState(false);
  const [activities, setActivities] = useState([]);
  const [messageTemplates, setMessageTemplates] = useState(DEFAULT_MESSAGE_TEMPLATES);
  const [selectedTemplateStage, setSelectedTemplateStage] = useState('new');
  const [templateDraft, setTemplateDraft] = useState(DEFAULT_MESSAGE_TEMPLATES.new);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateError, setTemplateError] = useState('');
  const [textRecipientStage, setTextRecipientStage] = useState('all');
  const [textRecipientSearch, setTextRecipientSearch] = useState('');
  const [selectedTextVisitorIds, setSelectedTextVisitorIds] = useState([]);
  const [textBatchOpen, setTextBatchOpen] = useState(false);
  const [textBatchQueue, setTextBatchQueue] = useState([]);
  const [textBatchIndex, setTextBatchIndex] = useState(0);
  const [openedTextVisitorId, setOpenedTextVisitorId] = useState('');
  const [textBatchError, setTextBatchError] = useState('');
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
  const [showEdit, setShowEdit] = useState(false);
  const [assignedMemberDraft, setAssignedMemberDraft] = useState('');
  const canMoveToDirectory = isAdmin || isSeniorPastor;
  const actor = { uid: user?.uid || '', email: user?.email || '' };
  const getGuestIntakeUrl = () => (
    typeof window === 'undefined' ? '' : `${window.location.origin}/church-care-intake`
  );
  const getGuestIntakeQrUrl = () => {
    const url = getGuestIntakeUrl();
    return url
      ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=16&data=${encodeURIComponent(url)}`
      : '';
  };
  const activeVisitors = useMemo(() => visitors.filter((visitor) => visitor.status === 'active'), [visitors]);
  const eligibleTeamMembers = useMemo(
    () => people.filter((person) => ['Member', 'Staff', 'Volunteer'].includes(person.type)).sort((a, b) => getPersonName(a).localeCompare(getPersonName(b))),
    [people]
  );
  const eligibleTextRecipients = useMemo(
    () => activeVisitors.filter((visitor) => visitor.status === 'active' && visitor.contactConsent && visitor.phone),
    [activeVisitors]
  );
  const visibleTextRecipients = useMemo(() => eligibleTextRecipients.filter((visitor) => {
    const matchesStage = textRecipientStage === 'all' || visitor.stage === textRecipientStage;
    const searchTerm = textRecipientSearch.trim().toLowerCase();
    const matchesSearch = !searchTerm || (
      `${getPersonName(visitor)} ${visitor.phone || ''} ${visitor.email || ''}`.toLowerCase().includes(searchTerm)
    );
    return matchesStage && matchesSearch;
  }), [eligibleTextRecipients, textRecipientStage, textRecipientSearch]);
  const selectedTextCount = eligibleTextRecipients.filter((visitor) => selectedTextVisitorIds.includes(String(visitor.id))).length;
  const currentTextVisitorId = textBatchQueue[textBatchIndex] || '';
  const currentTextVisitor = eligibleTextRecipients.find((visitor) => String(visitor.id) === currentTextVisitorId) || null;
  const currentTextPreview = useMemo(() => {
    if (!currentTextVisitor) return { message: '', error: '' };
    try {
      return {
        message: getPersonalizedText(
          currentTextVisitor,
          messageTemplates[currentTextVisitor.stage] || DEFAULT_MESSAGE_TEMPLATES[currentTextVisitor.stage]
        ),
        error: '',
      };
    } catch (error) {
      return { message: '', error: error.message || 'Could not prepare this message.' };
    }
  }, [currentTextVisitor, messageTemplates]);

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

  useEffect(() => subscribeToChurchCareMessageTemplates(
    (savedTemplates) => {
      const nextTemplates = { ...DEFAULT_MESSAGE_TEMPLATES };
      savedTemplates.forEach((template) => {
        if (DEFAULT_MESSAGE_TEMPLATES[template.id] && typeof template.body === 'string') {
          nextTemplates[template.id] = template.body;
        }
      });
      setMessageTemplates(nextTemplates);
      setTemplateError('');
    },
    (error) => {
      console.error('[ChurchCareApp] Message templates subscription failed:', error);
      setTemplateError('Could not load saved text templates. You can retry by refreshing this page.');
    }
  ), []);

  useEffect(() => {
    if (!db) {
      setIntakeLoading(false);
      setIntakeError('Guest intake review is unavailable because the database is not configured.');
      return undefined;
    }
    return subscribeToChurchCareGuestIntakeSubmissions(
      (submissions) => {
        setIntakeSubmissions(submissions);
        setIntakeLoading(false);
        setIntakeError('');
      },
      (error) => {
        console.error('[ChurchCareApp] Guest intake subscription failed:', error);
        setIntakeLoading(false);
        setIntakeError('Could not load guest intake submissions. Check your access and try again.');
      }
    );
  }, []);

  useEffect(() => {
    setTemplateDraft(messageTemplates[selectedTemplateStage] || DEFAULT_MESSAGE_TEMPLATES[selectedTemplateStage]);
  }, [messageTemplates, selectedTemplateStage]);

  const searchTerm = (search || globalSearch).trim().toLowerCase();
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
    setAssignedMemberDraft(selectedVisitor?.assignedTeamMemberId || '');
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

  const handleCopyGuestIntakeLink = async () => {
    const url = getGuestIntakeUrl();
    if (!url) {
      showToast('Unable to create the guest intake link right now.');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Guest intake link copied to clipboard.');
    } catch (error) {
      console.error('[ChurchCareApp] Could not copy guest intake link:', error);
      showToast(`Copy unavailable. Share this link: ${url}`);
    }
  };

  const handleReviewGuestIntake = async (submission, decision) => {
    if (decision === 'rejected' && !window.confirm(`Reject the Church Care intake for ${submission.firstName} ${submission.lastName}?`)) {
      return;
    }
    setReviewingSubmissionId(submission.id);
    try {
      if (decision === 'approved') {
        const visitor = await approveChurchCareGuestIntakeSubmission(submission.id, actor);
        setSelectedVisitorId(visitor.id);
        setActiveSection('care');
        setFilter('active');
        showToast(`${submission.firstName} ${submission.lastName} was added to Church Care.`);
      } else {
        await rejectChurchCareGuestIntakeSubmission(submission.id, actor);
        showToast('Guest intake submission rejected.');
      }
    } catch (error) {
      console.error(`[ChurchCareApp] Failed to ${decision} guest intake:`, error);
      showToast(error.message || `Could not ${decision} this submission.`);
    } finally {
      setReviewingSubmissionId('');
    }
  };

  const handleSaveTemplate = async () => {
    setTemplateSaving(true);
    setTemplateError('');
    try {
      await saveChurchCareMessageTemplate(selectedTemplateStage, templateDraft, actor);
      setMessageTemplates((current) => ({ ...current, [selectedTemplateStage]: templateDraft.trim() }));
      showToast(`${STAGES.find((stage) => stage.value === selectedTemplateStage)?.label || 'Stage'} text template saved.`);
    } catch (error) {
      console.error('[ChurchCareApp] Failed to save text template:', error);
      setTemplateError(error.message || 'Could not save this text template.');
    } finally {
      setTemplateSaving(false);
    }
  };

  const toggleTextRecipient = (visitorId) => {
    const id = String(visitorId);
    setSelectedTextVisitorIds((current) => (
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]
    ));
  };

  const toggleVisibleTextRecipients = () => {
    const visibleIds = visibleTextRecipients.map((visitor) => String(visitor.id));
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedTextVisitorIds.includes(id));
    setSelectedTextVisitorIds((current) => (
      allSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : [...new Set([...current, ...visibleIds])]
    ));
  };

  const handlePrepareTextBatch = () => {
    const eligibleIds = new Set(eligibleTextRecipients.map((visitor) => String(visitor.id)));
    const queue = selectedTextVisitorIds.filter((id) => eligibleIds.has(id));
    if (queue.length === 0) {
      showToast('Select at least one active guest with a phone number and contact permission.');
      return;
    }
    setTextBatchQueue(queue);
    setTextBatchIndex(0);
    setOpenedTextVisitorId('');
    setTextBatchError('');
    setTextBatchOpen(true);
  };

  const advanceTextBatch = () => {
    setOpenedTextVisitorId('');
    setTextBatchError('');
    if (textBatchIndex + 1 >= textBatchQueue.length) {
      const completedIds = new Set(textBatchQueue);
      setSelectedTextVisitorIds((current) => current.filter((id) => !completedIds.has(id)));
      setTextBatchQueue([]);
      setTextBatchIndex(0);
      setTextBatchOpen(false);
      return;
    }
    setTextBatchIndex((index) => index + 1);
  };

  const handleMarkTextSent = async () => {
    if (!currentTextVisitor || openedTextVisitorId !== String(currentTextVisitor.id)) return;
    if (!window.confirm(`Did you send the text to ${getPersonName(currentTextVisitor)} from your phone?`)) return;
    setSaving(true);
    setTextBatchError('');
    try {
      await recordChurchCareTextMarkedSent(
        currentTextVisitor.id,
        currentTextVisitor.stage,
        currentTextPreview.message,
        actor
      );
      advanceTextBatch();
    } catch (error) {
      console.error('[ChurchCareApp] Failed to log sent text:', error);
      setTextBatchError(error.message || 'Could not record this text as sent.');
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

  const handleSaveVisitor = async (updates) => {
    if (!selectedVisitor) return;
    setSaving(true);
    try {
      await updateChurchCareVisitor(selectedVisitor.id, selectedVisitor, updates, actor);
      setShowEdit(false);
      showToast('Visitor information updated.');
    } catch (error) {
      console.error('[ChurchCareApp] Failed to update visitor information:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleAssignTeamMember = async () => {
    if (!selectedVisitor || selectedVisitor.status !== 'active') return;
    if (loadingPeople) {
      showToast('Wait for the church directory to finish loading.');
      return;
    }
    const member = eligibleTeamMembers.find((person) => String(person.id) === assignedMemberDraft) || null;
    if (assignedMemberDraft && !member) {
      showToast('Choose a team member from the church directory.');
      return;
    }
    setSaving(true);
    try {
      await assignChurchCareTeamMember(selectedVisitor.id, member, actor);
      showToast(member ? `Follow-up assigned to ${getPersonName(member)}.` : 'Follow-up assignment removed.');
    } catch (error) {
      console.error('[ChurchCareApp] Failed to assign follow-up:', error);
      showToast(error.message || 'Could not assign this follow-up.');
    } finally {
      setSaving(false);
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
          <p className="mt-1 max-w-2xl text-sm text-stone-500">Care for guests, coordinate follow-up, and prepare personal stage-based texts. Visitor records stay separate from the directory.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleCopyGuestIntakeLink} className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">
            <Clipboard size={15} /> Copy intake link
          </button>
          <button onClick={() => setIsIntakeQrOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">
            <QrCode size={15} /> Intake QR
          </button>
          {activeSection === 'care' && (
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-stone-800">
              <Plus size={16} /> Add visitor
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
        <button onClick={() => setActiveSection('care')} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${activeSection === 'care' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 hover:bg-stone-100'}`}>
          <Heart size={15} /> Guest care
        </button>
        <button onClick={() => setActiveSection('messages')} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${activeSection === 'messages' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 hover:bg-stone-100'}`}>
          <MessageSquareText size={15} /> Text messages
        </button>
        <button onClick={() => setActiveSection('intake')} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${activeSection === 'intake' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 hover:bg-stone-100'}`}>
          <Clipboard size={15} /> Guest intake
          {intakeSubmissions.filter((submission) => submission.status === 'pending').length > 0 && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">{intakeSubmissions.filter((submission) => submission.status === 'pending').length}</span>
          )}
        </button>
      </div>

      {activeSection === 'care' && (
        <>
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
                    {selectedVisitor.status !== 'converted' && (
                      <button disabled={saving} onClick={() => setShowEdit(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-50">
                        <Pencil size={13} /> Edit guest
                      </button>
                    )}
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
                {(selectedVisitor.ageBracket || selectedVisitor.gender || selectedVisitor.invitedBy || selectedVisitor.prayerRequest || selectedVisitor.childAgeBrackets?.length > 0) && (
                  <div className="mt-4 grid gap-3 rounded-xl bg-stone-50 p-4 sm:grid-cols-2">
                    {(selectedVisitor.ageBracket || selectedVisitor.gender) && (
                      <p className="text-xs text-stone-600">
                        <span className="font-semibold text-stone-800">Guest details: </span>
                        {[selectedVisitor.ageBracket, selectedVisitor.gender].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {selectedVisitor.invitedBy && (
                      <p className="text-xs text-stone-600"><span className="font-semibold text-stone-800">Invited by: </span>{selectedVisitor.invitedBy}</p>
                    )}
                    {selectedVisitor.childAgeBrackets?.length > 0 && (
                      <p className="text-xs text-stone-600"><span className="font-semibold text-stone-800">Children: </span>{selectedVisitor.childAgeBrackets.join(', ')}</p>
                    )}
                    {selectedVisitor.prayerRequest && (
                      <p className="whitespace-pre-wrap break-words text-xs text-stone-600 sm:col-span-2"><span className="font-semibold text-stone-800">Prayer request: </span>{selectedVisitor.prayerRequest}</p>
                    )}
                  </div>
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

              <div className="p-5">
                <label className="text-xs font-semibold text-stone-600" htmlFor="care-assignee">Assigned follow-up team member</label>
                <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                  <select
                    id="care-assignee"
                    disabled={selectedVisitor.status !== 'active' || loadingPeople}
                    value={assignedMemberDraft}
                    onChange={(event) => setAssignedMemberDraft(event.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-teal-500 disabled:bg-stone-50"
                  >
                    <option value="">Unassigned</option>
                    {eligibleTeamMembers.map((member) => (
                      <option key={member.id} value={member.id}>{getPersonName(member)}{member.type ? ` · ${member.type}` : ''}</option>
                    ))}
                  </select>
                  <button disabled={saving || loadingPeople || selectedVisitor.status !== 'active' || assignedMemberDraft === (selectedVisitor.assignedTeamMemberId || '')} onClick={handleAssignTeamMember} className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50">
                    Save assignment
                  </button>
                </div>
                {loadingPeople
                  ? <p className="mt-1.5 text-[11px] text-stone-500">Loading the church directory…</p>
                  : eligibleTeamMembers.length === 0 && <p className="mt-1.5 text-[11px] text-stone-500">Add team members as members, staff, or volunteers in the church directory to assign them here.</p>}
                {selectedVisitor.assignedTeamMemberId && !eligibleTeamMembers.some((person) => String(person.id) === selectedVisitor.assignedTeamMemberId) && (
                  <p className="mt-1.5 text-[11px] text-amber-700">The assigned person is no longer an active member, staff person, or volunteer in the directory.</p>
                )}
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
        </>
      )}

      {activeSection === 'messages' && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="mb-4">
              <h2 className="text-base font-bold text-stone-900">Stage message templates</h2>
              <p className="mt-1 text-xs leading-relaxed text-stone-500">Each draft is personalized with the guest’s name and signed “Lifegate Follow-up Team.” Church Care users can edit these templates.</p>
            </div>
            {templateError && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{templateError}</div>
            )}
            <label htmlFor="care-template-stage" className="text-xs font-semibold text-stone-600">Care stage</label>
            <select
              id="care-template-stage"
              value={selectedTemplateStage}
              onChange={(event) => setSelectedTemplateStage(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-teal-500"
            >
              {STAGES.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
            </select>
            <label htmlFor="care-template-body" className="mt-4 block text-xs font-semibold text-stone-600">Message text</label>
            <textarea
              id="care-template-body"
              value={templateDraft}
              maxLength={900}
              onChange={(event) => setTemplateDraft(event.target.value)}
              rows={7}
              className="mt-1.5 w-full resize-y rounded-lg border border-stone-200 px-3 py-2.5 text-sm leading-relaxed text-stone-800 outline-none focus:border-teal-500"
            />
            <div className="mt-1 flex flex-wrap justify-between gap-2 text-[11px] text-stone-500">
              <span>Use {'{firstName}'} or {'{name}'} to personalize.</span>
              <span>{templateDraft.length}/900</span>
            </div>
            <div className="mt-3 rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
              <p className="font-semibold text-stone-700">Preview</p>
              <p className="mt-1 whitespace-pre-wrap">{getTemplatePreview(templateDraft || DEFAULT_MESSAGE_TEMPLATES[selectedTemplateStage])}</p>
            </div>
            <button
              onClick={handleSaveTemplate}
              disabled={templateSaving}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
            >
              <Check size={15} /> {templateSaving ? 'Saving…' : 'Save stage template'}
            </button>
          </section>

          <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <div className="border-b border-stone-100 p-5">
              <h2 className="text-base font-bold text-stone-900">Prepare individual texts</h2>
              <p className="mt-1 text-xs leading-relaxed text-stone-500">Select guests to create one private SMS draft per person. Only active guests with a phone number and recorded contact permission can be selected. Nothing is sent automatically.</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input value={textRecipientSearch} onChange={(event) => setTextRecipientSearch(event.target.value)} placeholder="Find a guest" className="w-full rounded-lg border border-stone-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-500" />
                </div>
                <select value={textRecipientStage} onChange={(event) => setTextRecipientStage(event.target.value)} className="rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500">
                  <option value="all">All stages</option>
                  {STAGES.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
                </select>
              </div>
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-semibold text-stone-600">
                <input
                  type="checkbox"
                  checked={visibleTextRecipients.length > 0 && visibleTextRecipients.every((visitor) => selectedTextVisitorIds.includes(String(visitor.id)))}
                  onChange={toggleVisibleTextRecipients}
                  disabled={visibleTextRecipients.length === 0}
                  className="accent-teal-700"
                />
                Select all {visibleTextRecipients.length} shown
              </label>
            </div>
            <div className="max-h-[440px] divide-y divide-stone-100 overflow-y-auto">
              {visibleTextRecipients.length === 0 ? (
                <div className="p-8 text-center">
                  <Smartphone size={22} className="mx-auto mb-2 text-stone-400" />
                  <p className="text-sm font-semibold text-stone-700">No eligible guests</p>
                  <p className="mt-1 text-xs text-stone-500">Guests need an active Church Care record, a phone number, and recorded contact permission.</p>
                </div>
              ) : visibleTextRecipients.map((visitor) => {
                const id = String(visitor.id);
                const stageLabel = STAGES.find((stage) => stage.value === visitor.stage)?.label || 'New visitor';
                return (
                  <label key={id} className="flex cursor-pointer items-start gap-3 p-4 hover:bg-stone-50">
                    <input type="checkbox" checked={selectedTextVisitorIds.includes(id)} onChange={() => toggleTextRecipient(id)} className="mt-1 accent-teal-700" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <span className="truncate text-sm font-semibold text-stone-900">{getPersonName(visitor)}</span>
                        <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700">{stageLabel}</span>
                      </span>
                      <span className="mt-1 block text-xs text-stone-500">{visitor.phone}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="flex flex-col gap-2 border-t border-stone-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-stone-500">{selectedTextCount} guest{selectedTextCount === 1 ? '' : 's'} selected</span>
              <button
                onClick={handlePrepareTextBatch}
                disabled={selectedTextCount === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
              >
                <Send size={15} /> Prepare personal drafts
              </button>
            </div>
          </section>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900 xl:col-span-2">
            Texts open one guest at a time in your phone’s messaging app. The message includes the Lifegate Follow-up Team signature, but your phone may show your personal number as the sender. Review and send each text on your phone, then confirm here to add it to the guest’s care history.
          </div>
        </div>
      )}

      {activeSection === 'intake' && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-5">
            <h2 className="text-base font-bold text-stone-900">Guest intake submissions</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-stone-600">
              New form responses stay in a separate review queue. Approving a response creates a Church Care guest record only; it does not add anyone to the church directory.
            </p>
          </div>
          {intakeError && (
            <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{intakeError}</span>
            </div>
          )}
          {intakeLoading ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">Loading guest intake submissions…</div>
          ) : intakeSubmissions.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
              <Clipboard size={22} className="mx-auto mb-2 text-stone-400" />
              <p className="text-sm font-semibold text-stone-800">No intake submissions yet</p>
              <p className="mt-1 text-xs text-stone-500">Share the Church Care intake link or QR code to receive guest details here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {intakeSubmissions.map((submission) => (
                <article key={submission.id} className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-stone-900">{submission.firstName} {submission.lastName}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${submission.status === 'pending' ? 'bg-amber-100 text-amber-800' : submission.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'}`}>
                          {submission.status}
                        </span>
                      </div>
                      <p className="mt-1 break-words text-xs text-stone-500">
                        {[submission.phone, submission.email].filter(Boolean).join(' · ') || 'No contact details'}
                      </p>
                    </div>
                    {submission.status === 'pending' && (
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          disabled={reviewingSubmissionId === submission.id}
                          onClick={() => handleReviewGuestIntake(submission, 'rejected')}
                          className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          disabled={reviewingSubmissionId === submission.id}
                          onClick={() => handleReviewGuestIntake(submission, 'approved')}
                          className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                        >
                          {reviewingSubmissionId === submission.id ? 'Saving…' : 'Approve to Church Care'}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 grid gap-3 border-t border-stone-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div><p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">First visit</p><p className="mt-1 text-sm text-stone-700">{displayDate(submission.firstVisitDate)}</p></div>
                    <div><p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Age bracket</p><p className="mt-1 text-sm text-stone-700">{submission.ageBracket || 'Not provided'}</p></div>
                    <div><p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Gender</p><p className="mt-1 text-sm text-stone-700">{submission.gender || 'Not provided'}</p></div>
                    <div><p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Contact permission</p><p className="mt-1 text-sm text-stone-700">{submission.contactConsent ? 'Yes' : 'No'}</p></div>
                    <div className="sm:col-span-2"><p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Invited by</p><p className="mt-1 text-sm text-stone-700">{submission.invitedBy || 'Not provided'}</p></div>
                    <div className="sm:col-span-2"><p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Children</p><p className="mt-1 text-sm text-stone-700">{submission.childAgeBrackets?.length ? submission.childAgeBrackets.join(', ') : 'None listed'}</p></div>
                  </div>
                  {submission.prayerRequest && (
                    <div className="mt-3 rounded-xl bg-stone-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Prayer request</p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-stone-700">{submission.prayerRequest}</p>
                    </div>
                  )}
                  {submission.status === 'approved' && <p className="mt-3 text-xs text-emerald-700">This guest has been added to the Church Care visitor list.</p>}
                  {submission.status === 'rejected' && <p className="mt-3 text-xs text-stone-500">This submission was rejected and was not added to Church Care or the directory.</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {showCreate && <VisitorForm onClose={() => setShowCreate(false)} onSave={handleCreateVisitor} saving={saving} />}
      {showEdit && selectedVisitor && <VisitorEditForm visitor={selectedVisitor} onClose={() => setShowEdit(false)} onSave={handleSaveVisitor} saving={saving} />}
      {isIntakeQrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4" onClick={() => setIsIntakeQrOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Lifegate Church Care</p>
                <h2 className="mt-1 text-xl font-bold text-stone-900">Guest intake QR code</h2>
              </div>
              <button type="button" onClick={() => setIsIntakeQrOpen(false)} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100" aria-label="Close guest intake QR code"><X size={18} /></button>
            </div>
            <div className="mt-5 flex justify-center rounded-xl border border-stone-200 bg-stone-50 p-4">
              <img src={getGuestIntakeQrUrl()} alt="QR code for the Lifegate Church Care guest intake form" className="h-64 w-64 rounded-md border border-stone-200 bg-white p-2" />
            </div>
            <p className="mt-4 break-all text-xs text-stone-500">{getGuestIntakeUrl()}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={handleCopyGuestIntakeLink} className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50">Copy link</button>
              <button type="button" onClick={() => setIsIntakeQrOpen(false)} className="rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white hover:bg-stone-800">Done</button>
            </div>
          </div>
        </div>
      )}
      {textBatchOpen && (
        <TextBatchModal
          visitor={currentTextVisitor}
          position={textBatchIndex + 1}
          total={textBatchQueue.length}
          message={currentTextPreview.message}
          messageError={currentTextPreview.error}
          smsHref={currentTextVisitor && currentTextPreview.message ? getSmsHref(currentTextVisitor, currentTextPreview.message) : ''}
          opened={Boolean(currentTextVisitor && openedTextVisitorId === String(currentTextVisitor.id))}
          error={textBatchError}
          saving={saving}
          onOpenText={setOpenedTextVisitorId}
          onMarkSent={handleMarkTextSent}
          onSkip={advanceTextBatch}
          onClose={() => {
            setTextBatchOpen(false);
            setOpenedTextVisitorId('');
            setTextBatchError('');
          }}
        />
      )}
    </div>
  );
}
