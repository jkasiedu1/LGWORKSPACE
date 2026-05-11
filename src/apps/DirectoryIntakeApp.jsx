import { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { createDirectoryIntakeSubmission } from '../lib/firestoreServices';
import { validateDirectoryIntakeSubmission } from '../lib/validation';

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  type: 'Member',
  gender: 'Female',
  parents: '',
  parentPhone: '',
  allergies: '',
  notes: '',
};

export default function DirectoryIntakeApp() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = useMemo(() => !submitting, [submitting]);
  const isChildSubmission = form.type === 'Child';

  const handleChange = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    const validationResult = validateDirectoryIntakeSubmission(form);
    if (!validationResult.valid) {
      setErrorMessage(validationResult.message);
      return;
    }

    setSubmitting(true);
    try {
      await createDirectoryIntakeSubmission({
        ...form,
        source: 'public-directory-intake',
      });
      setSubmitted(true);
      setForm(INITIAL_FORM);
    } catch (error) {
      console.error('[DirectoryIntakeApp] Failed to submit intake form:', error);
      const errorCode = String(error?.code || '').toLowerCase();

      if (errorCode.includes('permission-denied')) {
        setErrorMessage('Submission is blocked by Firestore security rules. Please ask an admin to deploy the latest rules, then try again.');
      } else if (errorCode.includes('unavailable') || errorCode.includes('network')) {
        setErrorMessage('Network issue while submitting. Please check your connection and try again.');
      } else {
        setErrorMessage('We could not submit your information. Please try again in a moment.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#e0f2fe,_#f8fafc_45%,_#fefce8)] px-4 py-10 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-3xl border border-white/70 bg-white/85 shadow-2xl backdrop-blur p-6 md:p-10">
          <p className="text-xs tracking-[0.25em] font-bold uppercase text-sky-700">Lifegate Directory</p>
          <h1 className="mt-3 font-serif text-4xl text-stone-900 leading-tight">Member &amp; Family Information Form</h1>
          <p className="mt-3 text-sm text-stone-600 max-w-xl">
            Fill this once and our team will register your details in the church directory after review.
          </p>

          {submitted && (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 text-sm font-medium flex items-center gap-2">
              <CheckCircle2 size={16} />
              Thank you. Your submission was received and is now pending approval.
            </div>
          )}

          {errorMessage && (
            <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 text-sm font-medium">
              {errorMessage}
            </div>
          )}

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="space-y-1.5 text-sm text-stone-700">
                <span className="font-semibold">First name</span>
                <input
                  value={form.firstName}
                  onChange={(event) => handleChange('firstName', event.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
                  placeholder="Jane"
                />
              </label>

              <label className="space-y-1.5 text-sm text-stone-700">
                <span className="font-semibold">Last name</span>
                <input
                  value={form.lastName}
                  onChange={(event) => handleChange('lastName', event.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
                  placeholder="Doe"
                />
              </label>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <label className="space-y-1.5 text-sm text-stone-700">
                <span className="font-semibold">{isChildSubmission ? 'Child email (optional)' : 'Email'}</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => handleChange('email', event.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
                  placeholder="jane@example.com"
                />
              </label>

              <label className="space-y-1.5 text-sm text-stone-700">
                <span className="font-semibold">{isChildSubmission ? 'Child phone (optional)' : 'Phone'}</span>
                <input
                  value={form.phone}
                  onChange={(event) => handleChange('phone', event.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
                  placeholder="(555) 123-4567"
                />
              </label>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <label className="space-y-1.5 text-sm text-stone-700">
                <span className="font-semibold">Profile type</span>
                <select
                  value={form.type}
                  onChange={(event) => handleChange('type', event.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
                >
                  <option value="Member">Member</option>
                  <option value="Volunteer">Volunteer</option>
                  <option value="First Time">First Time Guest</option>
                  <option value="Returning">Returning Guest</option>
                  <option value="Guest">Guest</option>
                  <option value="Child">Child (Lifegate Kids)</option>
                </select>
              </label>

              <label className="space-y-1.5 text-sm text-stone-700">
                <span className="font-semibold">Gender</span>
                <select
                  value={form.gender}
                  onChange={(event) => handleChange('gender', event.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </select>
              </label>
            </div>

            <label className="space-y-1.5 text-sm text-stone-700 block">
              <span className="font-semibold">Address</span>
              <input
                value={form.address}
                onChange={(event) => handleChange('address', event.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
                placeholder="123 Main St, City"
              />
            </label>

            {isChildSubmission && (
              <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4 space-y-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Parent / Guardian Details</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <label className="space-y-1.5 text-sm text-stone-700">
                    <span className="font-semibold">Parent/guardian name</span>
                    <input
                      value={form.parents}
                      onChange={(event) => handleChange('parents', event.target.value)}
                      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
                      placeholder="John & Jane Doe"
                    />
                  </label>

                  <label className="space-y-1.5 text-sm text-stone-700">
                    <span className="font-semibold">Parent/guardian phone</span>
                    <input
                      value={form.parentPhone}
                      onChange={(event) => handleChange('parentPhone', event.target.value)}
                      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
                      placeholder="(555) 123-4567"
                    />
                  </label>
                </div>

                <label className="space-y-1.5 text-sm text-stone-700 block">
                  <span className="font-semibold">Allergies / medical notes (optional)</span>
                  <input
                    value={form.allergies}
                    onChange={(event) => handleChange('allergies', event.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
                    placeholder="Peanut allergy, inhaler, etc."
                  />
                </label>
              </div>
            )}

            <label className="space-y-1.5 text-sm text-stone-700 block">
              <span className="font-semibold">Notes (optional)</span>
              <textarea
                value={form.notes}
                onChange={(event) => handleChange('notes', event.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 min-h-24 outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
                placeholder="Anything you want our admin team to know"
              />
            </label>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full mt-2 rounded-xl bg-stone-900 text-white px-4 py-3 text-sm font-semibold hover:bg-stone-800 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Submit Directory Information
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
