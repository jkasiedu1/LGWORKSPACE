import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { createPublicExpenseIntakeSubmission } from '../lib/firestoreServices';
import {
  DEFAULT_MINISTRY_CATEGORIES,
  EXPENSE_CATEGORY_GROUPS,
  PUBLIC_EXPENSE_CATEGORY_NAMES,
} from '../lib/expenseCategories';

const today = () => new Date().toISOString().slice(0, 10);
const INITIAL_FORM = () => ({
  submitterName: '',
  submitterEmail: '',
  submitterPhone: '',
  date: today(),
  amount: '',
  mainCategory: 'Travel & Transportation',
  subcategory: 'Transport',
  description: '',
  payee: '',
  paymentMethod: '',
  fund: '',
  reference: '',
});
const INPUT_CLASS = 'box-border min-h-12 min-w-0 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100';
const DATE_AMOUNT_CLASS = `${INPUT_CLASS} h-12 max-w-full`;
const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

function IntakeField({ label, children }) {
  return (
    <label className="block min-w-0 space-y-1.5 text-sm text-stone-700">
      <span className="font-semibold">{label}</span>
      {children}
    </label>
  );
}

export default function ExpenseIntakeApp() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [ministryCategories, setMinistryCategories] = useState(DEFAULT_MINISTRY_CATEGORIES);
  const [categoryLoadError, setCategoryLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!db) return undefined;
    return onSnapshot(
      doc(db, 'settings', 'financeExpenseCategories'),
      (snapshot) => {
        const categories = snapshot.data()?.ministryCategories;
        if (Array.isArray(categories) && categories.every((item) => typeof item === 'string')) {
          setMinistryCategories(categories.length ? categories : DEFAULT_MINISTRY_CATEGORIES);
        }
        setCategoryLoadError(false);
      },
      (error) => {
        console.error('[ExpenseIntakeApp] Ministry categories subscription failed:', error);
        setCategoryLoadError(true);
      }
    );
  }, []);

  const groups = useMemo(() => EXPENSE_CATEGORY_GROUPS
    .filter((group) => PUBLIC_EXPENSE_CATEGORY_NAMES.includes(group.name))
    .map((group) => group.name === 'Ministries'
      ? { ...group, subcategories: ministryCategories }
      : group), [ministryCategories]);
  const selectedGroup = groups.find((group) => group.name === form.mainCategory) || groups[0];

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleCategoryChange = (mainCategory) => {
    const nextGroup = groups.find((group) => group.name === mainCategory);
    setForm((current) => ({
      ...current,
      mainCategory,
      subcategory: nextGroup?.subcategories[0] || '',
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    const amount = Number(form.amount);
    if (!form.submitterName.trim()) {
      setErrorMessage('Your name is required.');
      return;
    }
    if (!form.submitterEmail.trim() && !form.submitterPhone.trim()) {
      setErrorMessage('Please provide an email address or phone number.');
      return;
    }
    if (form.submitterEmail && !EMAIL_PATTERN.test(form.submitterEmail.trim())) {
      setErrorMessage('Enter a valid email address.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) {
      setErrorMessage('Enter an expense amount greater than zero and no more than $10,000,000.');
      return;
    }
    const parsedDate = new Date(`${form.date}T00:00:00.000Z`);
    if (!form.date || !/^\d{4}-\d{2}-\d{2}$/.test(form.date)
      || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== form.date) {
      setErrorMessage('Enter a valid expense date.');
      return;
    }
    if (!groups.some((group) => group.name === form.mainCategory)
      || !selectedGroup.subcategories.includes(form.subcategory)) {
      setErrorMessage('Choose a valid expense category.');
      return;
    }
    if (!form.description.trim()) {
      setErrorMessage('Add a short description of the expense.');
      return;
    }

    setSubmitting(true);
    try {
      await createPublicExpenseIntakeSubmission({
        ...form,
        amount,
        submitterName: form.submitterName.trim(),
        submitterEmail: form.submitterEmail.trim(),
        submitterPhone: form.submitterPhone.trim(),
        description: form.description.trim(),
        payee: form.payee.trim(),
        paymentMethod: form.paymentMethod.trim(),
        fund: form.fund.trim(),
        reference: form.reference.trim(),
      });
      setSubmitted(true);
      setForm(INITIAL_FORM());
    } catch (error) {
      console.error('[ExpenseIntakeApp] Failed to submit expense intake:', error);
      const errorCode = String(error?.code || '').toLowerCase();
      if (errorCode.includes('permission-denied')) {
        setErrorMessage('The expense intake form is not enabled yet. Please contact the church office.');
      } else if (errorCode.includes('unavailable') || errorCode.includes('network')) {
        setErrorMessage('There was a network issue. Check your connection and try again.');
      } else {
        setErrorMessage('We could not submit your expense. Please try again in a moment.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#ccfbf1,_#f8fafc_45%,_#fefce8)] px-4 py-8 font-sans sm:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-2xl backdrop-blur sm:p-8 md:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-teal-700">Lifegate Finance</p>
          <h1 className="mt-3 font-serif text-3xl leading-tight text-stone-900 sm:text-4xl">Expense Intake Form</h1>
          <p className="mt-3 max-w-xl text-sm text-stone-600">
            Share expense details with the finance team. No church-app account is needed.
          </p>

          <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50/70 px-4 py-3 text-sm text-teal-900">
            This public form does not create an account or provide access to the church app. Submissions are only visible to finance reviewers. Receipt images cannot be attached through this form.
          </div>

          {categoryLoadError && (
            <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Custom ministry categories could not be loaded. The standard ministry categories are available.
            </p>
          )}

          {submitted && (
            <div role="status" className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              <CheckCircle2 size={17} />
              Thank you. Your expense was received and is pending finance review.
            </div>
          )}

          {errorMessage && (
            <p role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {errorMessage}
            </p>
          )}

          <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <IntakeField label="Your name">
                <input required maxLength={120} autoComplete="name" value={form.submitterName} onChange={(event) => updateForm('submitterName', event.target.value)} className={INPUT_CLASS} />
              </IntakeField>
              <IntakeField label="Email (or phone)">
                <input type="email" maxLength={254} autoComplete="email" value={form.submitterEmail} onChange={(event) => updateForm('submitterEmail', event.target.value)} className={INPUT_CLASS} />
              </IntakeField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <IntakeField label="Phone (or email)">
                <input type="tel" maxLength={30} autoComplete="tel" value={form.submitterPhone} onChange={(event) => updateForm('submitterPhone', event.target.value)} className={INPUT_CLASS} />
              </IntakeField>
              <IntakeField label="Expense date">
                <input required type="date" value={form.date} onChange={(event) => updateForm('date', event.target.value)} className={DATE_AMOUNT_CLASS} />
              </IntakeField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <IntakeField label="Amount (USD)">
                <input required type="number" inputMode="decimal" min="0.01" max="10000000" step="0.01" value={form.amount} onChange={(event) => updateForm('amount', event.target.value)} placeholder="0.00" className={DATE_AMOUNT_CLASS} />
              </IntakeField>
              <IntakeField label="Expense area">
                <select value={form.mainCategory} onChange={(event) => handleCategoryChange(event.target.value)} className={INPUT_CLASS}>
                  {groups.map((group) => <option key={group.name} value={group.name}>{group.name}</option>)}
                </select>
              </IntakeField>
            </div>

            <IntakeField label={form.mainCategory === 'Ministries' ? 'Ministry category' : 'Travel type'}>
              <select required value={form.subcategory} onChange={(event) => updateForm('subcategory', event.target.value)} className={INPUT_CLASS}>
                <option value="">Select a category</option>
                {selectedGroup.subcategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </IntakeField>

            <IntakeField label="Description">
              <textarea required maxLength={500} rows={3} value={form.description} onChange={(event) => updateForm('description', event.target.value)} placeholder="What was purchased or paid for?" className={`${INPUT_CLASS} min-h-24 resize-y`} />
            </IntakeField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <IntakeField label="Payee or supplier (optional)">
                <input maxLength={160} value={form.payee} onChange={(event) => updateForm('payee', event.target.value)} className={INPUT_CLASS} />
              </IntakeField>
              <IntakeField label="Fund or budget (optional)">
                <input maxLength={120} value={form.fund} onChange={(event) => updateForm('fund', event.target.value)} className={INPUT_CLASS} />
              </IntakeField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <IntakeField label="Payment method (optional)">
                <select value={form.paymentMethod} onChange={(event) => updateForm('paymentMethod', event.target.value)} className={INPUT_CLASS}>
                  <option value="">Select method</option>
                  <option>Cash</option><option>Check</option><option>Debit/Credit Card</option>
                  <option>Bank Transfer</option><option>Other</option>
                </select>
              </IntakeField>
              <IntakeField label="Payment reference (optional)">
                <input maxLength={120} value={form.reference} onChange={(event) => updateForm('reference', event.target.value)} className={INPUT_CLASS} />
              </IntakeField>
            </div>

            <button type="submit" disabled={submitting} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? <Loader2 className="animate-spin" size={17} /> : <Send size={16} />}
              {submitting ? 'Submitting…' : 'Submit expense'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
