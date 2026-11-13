import { useState } from 'react';
import { CheckCircle2, Loader2, Send, UsersRound } from 'lucide-react';
import { createChurchCareGuestIntakeSubmission } from '../lib/churchCareServices';
import { validateChurchCareGuestIntake } from '../lib/validation';

const GUEST_AGE_BRACKETS = ['Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+', 'Prefer not to say'];
const CHILD_AGE_BRACKETS = ['Under 5', '5-12', '13-17'];
const INPUT_CLASS = 'min-h-12 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100';

function getToday() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function IntakeField({ label, children }) {
  return (
    <label className="block min-w-0 space-y-1.5 text-sm text-stone-700">
      <span className="font-semibold">{label}</span>
      {children}
    </label>
  );
}

function createInitialForm() {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    firstVisitDate: getToday(),
    gender: '',
    ageBracket: '',
    invitedBy: '',
    prayerRequest: '',
    childAgeBrackets: [],
    contactConsent: false,
  };
}

export default function ChurchCareGuestIntakeApp() {
  const [form, setForm] = useState(createInitialForm);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const changeChildCount = (value) => {
    const count = Number(value);
    setForm((current) => ({
      ...current,
      childAgeBrackets: Array.from(
        { length: count },
        (_, index) => current.childAgeBrackets[index] || ''
      ),
    }));
  };

  const updateChildAge = (index, ageBracket) => {
    setForm((current) => ({
      ...current,
      childAgeBrackets: current.childAgeBrackets.map((currentBracket, childIndex) => (
        childIndex === index ? ageBracket : currentBracket
      )),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    const normalizedForm = {
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      invitedBy: form.invitedBy.trim(),
      prayerRequest: form.prayerRequest.trim(),
    };
    const validation = validateChurchCareGuestIntake(normalizedForm);
    if (!validation.valid) {
      setErrorMessage(validation.message);
      return;
    }

    setSubmitting(true);
    try {
      await createChurchCareGuestIntakeSubmission(normalizedForm);
      setSubmitted(true);
      setForm(createInitialForm());
    } catch (error) {
      console.error('[ChurchCareGuestIntakeApp] Failed to submit guest intake:', error);
      const errorCode = String(error?.code || '').toLowerCase();
      if (errorCode.includes('permission-denied')) {
        setErrorMessage('This form is not enabled yet. Please contact the Lifegate team.');
      } else if (errorCode.includes('unavailable') || errorCode.includes('network')) {
        setErrorMessage('There was a network issue. Check your connection and try again.');
      } else {
        setErrorMessage('We could not submit your information. Please try again in a moment.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#ccfbf1,_#f8fafc_45%,_#fefce8)] px-4 py-8 font-sans sm:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-2xl backdrop-blur sm:p-8 md:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-teal-700">Lifegate Church Care</p>
          <h1 className="mt-3 font-serif text-3xl leading-tight text-stone-900 sm:text-4xl">Guest &amp; Family Welcome Form</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-stone-600">
            We’re glad you visited. Share a little about yourself so our team can welcome and care for you.
          </p>
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-teal-100 bg-teal-50/70 px-4 py-3 text-sm text-teal-900">
            <UsersRound size={17} className="mt-0.5 shrink-0" />
            <p>This information goes to the Church Care team for review. It is not added to the church directory unless you later decide to become a member.</p>
          </div>

          {submitted && (
            <div role="status" className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              <CheckCircle2 size={17} />
              Thank you. Your information was received for Church Care team review.
            </div>
          )}
          {errorMessage && (
            <p role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {errorMessage}
            </p>
          )}

          <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <IntakeField label="First name">
                <input required maxLength={80} autoComplete="given-name" value={form.firstName} onChange={(event) => updateForm('firstName', event.target.value)} className={INPUT_CLASS} />
              </IntakeField>
              <IntakeField label="Last name">
                <input required maxLength={80} autoComplete="family-name" value={form.lastName} onChange={(event) => updateForm('lastName', event.target.value)} className={INPUT_CLASS} />
              </IntakeField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <IntakeField label="Phone (or email)">
                <input type="tel" maxLength={30} autoComplete="tel" value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} className={INPUT_CLASS} />
              </IntakeField>
              <IntakeField label="Email (or phone)">
                <input type="email" maxLength={254} autoComplete="email" value={form.email} onChange={(event) => updateForm('email', event.target.value)} className={INPUT_CLASS} />
              </IntakeField>
            </div>
            <p className="-mt-3 text-xs text-stone-500">Please provide at least one way for our team to reach you.</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <IntakeField label="Visit date">
                <input required type="date" value={form.firstVisitDate} onChange={(event) => updateForm('firstVisitDate', event.target.value)} className={INPUT_CLASS} />
              </IntakeField>
              <IntakeField label="Age bracket">
                <select required value={form.ageBracket} onChange={(event) => updateForm('ageBracket', event.target.value)} className={INPUT_CLASS}>
                  <option value="">Select age</option>
                  {GUEST_AGE_BRACKETS.map((age) => <option key={age} value={age}>{age}</option>)}
                </select>
              </IntakeField>
              <IntakeField label="Gender">
                <select required value={form.gender} onChange={(event) => updateForm('gender', event.target.value)} className={INPUT_CLASS}>
                  <option value="">Select gender</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </IntakeField>
            </div>

            <IntakeField label="Who invited you? (optional)">
              <input maxLength={120} value={form.invitedBy} onChange={(event) => updateForm('invitedBy', event.target.value)} className={INPUT_CLASS} placeholder="Name of the person who invited you" />
            </IntakeField>

            <section className="space-y-4 rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:items-end">
                <IntakeField label="How many children are with your family?">
                  <select value={form.childAgeBrackets.length} onChange={(event) => changeChildCount(event.target.value)} className={INPUT_CLASS}>
                    {Array.from({ length: 11 }, (_, count) => <option key={count} value={count}>{count}</option>)}
                  </select>
                </IntakeField>
                <p className="pb-2 text-xs text-stone-500">If you have children with you, choose an age bracket for each child. Names are not requested here.</p>
              </div>
              {form.childAgeBrackets.map((ageBracket, index) => (
                <IntakeField key={`child-age-${index}`} label={`Child ${index + 1} age bracket`}>
                  <select required value={ageBracket} onChange={(event) => updateChildAge(index, event.target.value)} className={INPUT_CLASS}>
                    <option value="">Select age bracket</option>
                    {CHILD_AGE_BRACKETS.map((age) => <option key={age} value={age}>{age}</option>)}
                  </select>
                </IntakeField>
              ))}
            </section>

            <IntakeField label="Prayer request (optional)">
              <textarea maxLength={1000} rows={4} value={form.prayerRequest} onChange={(event) => updateForm('prayerRequest', event.target.value)} className={`${INPUT_CLASS} min-h-28 resize-y`} placeholder="Share anything you would like our team to pray about." />
            </IntakeField>
            <p className="-mt-3 text-right text-xs text-stone-400">{form.prayerRequest.length}/1000</p>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 p-4 text-sm text-stone-700">
              <input type="checkbox" checked={form.contactConsent} onChange={(event) => updateForm('contactConsent', event.target.checked)} className="mt-1 accent-teal-700" />
              <span>
                Lifegate may contact me about my visit using the phone number or email I provided.
                <span className="mt-1 block text-xs text-stone-500">Optional. If unchecked, your information can still be submitted, but we will not schedule a follow-up reminder.</span>
              </span>
            </label>

            <button type="submit" disabled={submitting} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? <Loader2 className="animate-spin" size={17} /> : <Send size={16} />}
              {submitting ? 'Submitting…' : 'Submit guest information'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
