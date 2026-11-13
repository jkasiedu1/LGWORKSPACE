import { useState } from 'react';
import { CheckCircle2, Loader2, Send, UsersRound } from 'lucide-react';
import ChurchCareGuestFields, { createChurchCareGuestForm } from './ChurchCareGuestFields';
import { createChurchCareGuestIntakeSubmission } from '../lib/churchCareServices';
import { validateChurchCareGuestIntake } from '../lib/validation';

export default function ChurchCareGuestIntakeApp() {
  const [form, setForm] = useState(createChurchCareGuestForm);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

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
      setForm(createChurchCareGuestForm());
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
            <ChurchCareGuestFields form={form} onChange={updateForm} />

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
