import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import {
  Check, CheckCircle2, Copy, FileText, Loader2, Plus, ReceiptText,
  ScanLine, Settings2, Upload, X,
} from 'lucide-react';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import {
  approvePublicExpenseIntakeSubmission,
  createExpense,
  rejectPublicExpenseIntakeSubmission,
  saveFinanceExpenseCategories,
  updateExpense,
} from '../lib/firestoreServices';
import { downloadPrivateReceipt, uploadMediaToR2 } from '../lib/mediaStorage';
import {
  DEFAULT_MINISTRY_CATEGORIES,
  EXPENSE_CATEGORY_GROUPS,
} from '../lib/expenseCategories';

const TODAY = () => new Date().toISOString().slice(0, 10);
const EMPTY_FORM = () => ({
  date: TODAY(),
  amount: '',
  mainCategory: 'Facilities & Operations',
  subcategory: 'Utilities',
  description: '',
  payee: '',
  paymentMethod: '',
  fund: '',
  reference: '',
});
const amountValue = (value) => Number.parseFloat(String(value ?? '').replace(/[$,]/g, '')) || 0;
const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

function extractReceiptDetails(text) {
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const payee = lines.find((line) =>
    line.length >= 2 && line.length <= 60 && !/(receipt|invoice|thank you|cashier)/i.test(line)
  ) || '';
  const dateText = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  let date = '';
  if (dateText) {
    const [, month, day, rawYear] = dateText;
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const totalLine = lines.find((line) => /\b(total|amount due|grand total)\b/i.test(line));
  const amountMatches = (totalLine || text).match(/(?:\$|USD\s*)\s*\d[\d,]*(?:\.\d{2})?|\b\d[\d,]*\.\d{2}\b/g) || [];
  const amount = amountMatches
    .map((value) => amountValue(value))
    .filter((value) => value > 0)
    .slice(-1)[0];
  return { payee, date, amount: amount ? amount.toFixed(2) : '' };
}

function FormField({ label, children, className = '' }) {
  return (
    <label className={`block min-w-0 space-y-1.5 text-sm text-stone-700 ${className}`}>
      <span className="font-semibold">{label}</span>
      {children}
    </label>
  );
}

const inputClass = 'min-h-12 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100';
const dateAmountInputClass = `${inputClass} box-border h-12 min-w-0 max-w-full`;

export default function ExpenseManagement({
  expenses = [],
  expenseIntakeSubmissions = [],
  loadingExpenseIntakeSubmissions = false,
  loadingExpenses = false,
  canReviewExpenses = false,
  showToast = () => {},
}) {
  const { user } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [categorySettingsOpen, setCategorySettingsOpen] = useState(false);
  const [ministryCategories, setMinistryCategories] = useState(DEFAULT_MINISTRY_CATEGORIES);
  const [newCategory, setNewCategory] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [receiptFile, setReceiptFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [shareLink, setShareLink] = useState('');
  const [reviewingId, setReviewingId] = useState('');
  const [reviewingIntakeId, setReviewingIntakeId] = useState('');
  const [receiptError, setReceiptError] = useState('');
  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    if (!db || !user) return undefined;
    return onSnapshot(
      doc(db, 'settings', 'financeExpenseCategories'),
      (snapshot) => {
        const savedCategories = snapshot.data()?.ministryCategories;
        if (Array.isArray(savedCategories)) setMinistryCategories(savedCategories);
      },
      (error) => console.error('[ExpenseManagement] Ministry categories subscription failed:', error)
    );
  }, [user]);

  const groups = useMemo(() => EXPENSE_CATEGORY_GROUPS.map((group) => (
    group.name === 'Ministries' ? { ...group, subcategories: ministryCategories } : group
  )), [ministryCategories]);

  const selectedGroup = groups.find((group) => group.name === form.mainCategory) || groups[0];
  const filteredExpenses = useMemo(() => expenses
    .filter((expense) => statusFilter === 'all' || expense.status === statusFilter)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))), [expenses, statusFilter]);
  const filteredIntakeSubmissions = useMemo(() => expenseIntakeSubmissions
    .filter((submission) => statusFilter === 'all' || (submission.status || 'pending') === statusFilter)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))), [expenseIntakeSubmissions, statusFilter]);
  const approvedTotal = expenses
    .filter((expense) => expense.status === 'approved')
    .reduce((sum, expense) => sum + amountValue(expense.amount), 0);
  const pendingCount = expenses.filter((expense) => expense.status === 'pending').length
    + expenseIntakeSubmissions.filter((submission) => !submission.status || submission.status === 'pending').length;

  useEffect(() => {
    if (!receiptFile) {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(receiptFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [receiptFile]);

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const copyIntakeLink = async () => {
    const url = new URL('/expense-intake', window.location.origin);
    const link = url.toString();
    setShareLink(link);
    try {
      await navigator.clipboard.writeText(link);
      setActionMessage({ type: 'success', text: 'Public expense intake link copied. It does not grant access to the church app.' });
      showToast('Public expense intake link copied');
    } catch (error) {
      console.warn('[ExpenseManagement] Clipboard access unavailable:', error);
      setActionMessage({ type: 'error', text: 'Copy the public expense intake link displayed below.' });
      showToast('Copy the expense intake link shown below');
    }
  };

  const openExpenseForm = () => {
    setActionMessage(null);
    setFormOpen(true);
  };

  const handleReceiptSelect = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setReceiptError('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setReceiptFile(null);
      setReceiptError('Choose a JPG, PNG, or WebP receipt image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setReceiptFile(null);
      setReceiptError('Receipt images must be 10 MB or smaller.');
      return;
    }
    setReceiptFile(file);
  };

  const scanReceipt = async () => {
    if (!receiptFile) return;
    setScanning(true);
    setScanProgress(0);
    try {
      const { default: Tesseract } = await import('tesseract.js');
      const result = await Tesseract.recognize(receiptFile, 'eng', {
        logger: (message) => {
          if (message.status === 'recognizing text' && Number.isFinite(message.progress)) {
            setScanProgress(Math.round(message.progress * 100));
          }
        },
      });
      const details = extractReceiptDetails(result.data.text);
      setForm((current) => ({
        ...current,
        ...(details.payee && !current.payee ? { payee: details.payee } : {}),
        ...(details.amount && !current.amount ? { amount: details.amount } : {}),
        ...(details.date ? { date: details.date } : {}),
      }));
      showToast('Receipt scanned. Confirm the suggested details before submitting.');
    } catch (error) {
      console.error('[ExpenseManagement] Receipt scan failed:', error);
      setReceiptError('Could not scan this image. You can still enter the details manually.');
    } finally {
      setScanning(false);
      setScanProgress(0);
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM());
    setReceiptFile(null);
    setReceiptError('');
    setFormOpen(false);
  };

  const submitExpense = async (event) => {
    event.preventDefault();
    setReceiptError('');
    if (!Number.isFinite(amountValue(form.amount)) || amountValue(form.amount) <= 0) {
      setReceiptError('Enter an expense amount greater than zero.');
      return;
    }
    if (!form.description.trim()) {
      setReceiptError('Add a short description of the expense.');
      return;
    }
    if (form.mainCategory === 'Ministries' && !form.subcategory) {
      setReceiptError('Choose a ministry category.');
      return;
    }

    setSubmitting(true);
    try {
      let receipt = {};
      if (receiptFile) {
        const upload = await uploadMediaToR2(receiptFile, 'financial-receipts');
        if (!upload.mediaKey) throw new Error('Receipt upload did not return a private file reference.');
        receipt = { receiptKey: upload.mediaKey, receiptName: upload.mediaName };
      }

      await createExpense({
        ...form,
        amount: amountValue(form.amount),
        description: form.description.trim(),
        payee: form.payee.trim(),
        reference: form.reference.trim(),
        fund: form.fund.trim(),
        subcategory: form.subcategory || '',
        submittedBy: user?.displayName || user?.email || 'Church app user',
        submittedByUid: user?.uid || '',
        ...receipt,
      });
      resetForm();
      setActionMessage({ type: 'success', text: 'Expense submitted. It is pending finance review.' });
      showToast('Expense submitted for review');
    } catch (error) {
      console.error('[ExpenseManagement] Expense submission failed:', error);
      setActionMessage({ type: 'error', text: error.message || 'Expense could not be submitted. Please try again.' });
      setReceiptError(error.message || 'Expense could not be submitted. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const saveMinistryCategory = async (event) => {
    event.preventDefault();
    const category = newCategory.trim();
    if (!category || ministryCategories.some((item) => item.toLowerCase() === category.toLowerCase())) return;
    setSavingCategory(true);
    try {
      const nextCategories = [...ministryCategories, category];
      await saveFinanceExpenseCategories(nextCategories);
      setMinistryCategories(nextCategories);
      setNewCategory('');
      setActionMessage({ type: 'success', text: 'Ministry category added.' });
      showToast('Ministry category added');
    } catch (error) {
      console.error('[ExpenseManagement] Failed to save ministry category:', error);
      setActionMessage({ type: 'error', text: error.message || 'Could not save ministry category.' });
      showToast('Could not save ministry category');
    } finally {
      setSavingCategory(false);
    }
  };

  const reviewExpense = async (expense, status) => {
    setReviewingId(expense.id);
    try {
      await updateExpense(expense.id, {
        status,
        reviewedBy: user?.email || user?.displayName || 'Finance reviewer',
        reviewedAt: serverTimestamp(),
        reviewNote: '',
      });
      setActionMessage({ type: 'success', text: status === 'approved' ? 'Expense approved.' : 'Expense rejected.' });
      showToast(status === 'approved' ? 'Expense approved' : 'Expense rejected');
    } catch (error) {
      console.error('[ExpenseManagement] Expense review failed:', error);
      setActionMessage({ type: 'error', text: error.message || 'Could not update expense status.' });
      showToast('Could not update expense status');
    } finally {
      setReviewingId('');
    }
  };

  const reviewIntakeSubmission = async (submission, status) => {
    setReviewingIntakeId(submission.id);
    try {
      const reviewerName = user?.email || user?.displayName || 'Finance reviewer';
      if (status === 'approved') {
        await approvePublicExpenseIntakeSubmission(submission, user?.uid, reviewerName);
      } else {
        await rejectPublicExpenseIntakeSubmission(submission.id, reviewerName);
      }
      setActionMessage({
        type: 'success',
        text: status === 'approved'
          ? 'Public expense approved and added to the financial records.'
          : 'Public expense intake rejected.',
      });
      showToast(status === 'approved' ? 'Expense approved and recorded' : 'Expense intake rejected');
    } catch (error) {
      console.error('[ExpenseManagement] Public expense intake review failed:', error);
      setActionMessage({ type: 'error', text: error.message || 'Could not review this public expense.' });
      showToast('Could not review public expense');
    } finally {
      setReviewingIntakeId('');
    }
  };

  const openReceipt = async (expense) => {
    try {
      await downloadPrivateReceipt(expense.receiptKey, expense.receiptName);
      setActionMessage({ type: 'success', text: 'Receipt download started.' });
    } catch (error) {
      console.error('[ExpenseManagement] Receipt download failed:', error);
      setActionMessage({ type: 'error', text: error.message || 'Could not open receipt.' });
      showToast(error.message || 'Could not open receipt');
    }
  };

  return (
    <section className="space-y-5">
      {actionMessage && (
        <p
          role={actionMessage.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className={`rounded-xl border px-4 py-3 text-sm ${
            actionMessage.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {actionMessage.text}
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-stone-500">Approved expenses</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-stone-900">{canReviewExpenses ? money(approvedTotal) : '—'}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-stone-500">Pending review</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-amber-700">{canReviewExpenses ? pendingCount : '—'}</p>
        </div>
        <div className="flex flex-col justify-center gap-2 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:items-start">
          <button
            type="button"
            onClick={openExpenseForm}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white hover:bg-stone-800"
          >
            <Plus size={17} /> Submit an expense
          </button>
          <button
            type="button"
            onClick={copyIntakeLink}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            <Copy size={15} /> Copy public intake link
          </button>
        </div>
      </div>

      {shareLink && (
        <div className="break-all rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
          <p className="mb-1 font-semibold">Anyone with this link can submit an expense intake; it does not grant access to the church app.</p>
          <a className="underline underline-offset-2" href={shareLink}>{shareLink}</a>
          <p className="mt-1 text-xs text-teal-800">Only finance reviewers can see or approve submissions.</p>
        </div>
      )}

      {canReviewExpenses && (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-100 p-4 sm:px-5">
            <h2 className="text-base font-bold text-stone-900">Public intake submissions</h2>
            <p className="mt-0.5 text-xs text-stone-500">Approve to add the expense directly to the financial records.</p>
          </div>
          {loadingExpenseIntakeSubmissions ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-stone-500">
              <Loader2 className="animate-spin" size={17} /> Loading public submissions…
            </div>
          ) : filteredIntakeSubmissions.length === 0 ? (
            <div className="p-6 text-center text-sm text-stone-500">No public intake submissions match this filter.</div>
          ) : (
            <div className="divide-y divide-stone-100">
              {filteredIntakeSubmissions.map((submission) => {
                const status = submission.status || 'pending';
                const isProcessing = reviewingIntakeId === submission.id;
                return (
                  <article key={submission.id} className="space-y-3 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-stone-900">{submission.description}</p>
                        <p className="mt-1 text-sm text-stone-500">
                          {submission.mainCategory}{submission.subcategory ? ` · ${submission.subcategory}` : ''}
                        </p>
                        <p className="mt-1 text-xs text-stone-500">
                          {submission.date || 'No date'} · Submitted by {submission.submitterName || 'Unknown'}
                        </p>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-lg font-bold tabular-nums text-stone-900">{money(amountValue(submission.amount))}</p>
                        <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          status === 'approved' ? 'bg-emerald-50 text-emerald-700'
                            : status === 'rejected' ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-800'
                        }`}>
                          {status}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-500">
                      {submission.submitterEmail && <span>Email: {submission.submitterEmail}</span>}
                      {submission.submitterPhone && <span>Phone: {submission.submitterPhone}</span>}
                      {submission.payee && <span>Payee: {submission.payee}</span>}
                      {submission.fund && <span>Fund: {submission.fund}</span>}
                    </div>
                    {status === 'pending' && (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => reviewIntakeSubmission(submission, 'rejected')}
                          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-200 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                        >
                          <X size={15} /> Reject
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => reviewIntakeSubmission(submission, 'approved')}
                          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                        >
                          {isProcessing ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />}
                          Approve &amp; record
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-stone-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-base font-bold text-stone-900">Expense submissions</h2>
            <p className="mt-0.5 text-xs text-stone-500">
              {canReviewExpenses ? 'Review app submissions, receipts, and expense statuses.' : 'Your submissions are private until reviewed by finance.'}
            </p>
          </div>
          {canReviewExpenses && (
            <div className="flex flex-wrap gap-2">
              <select
                aria-label="Filter expenses by status"
                className="min-h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <button
                type="button"
                onClick={() => setCategorySettingsOpen(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-stone-200 px-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                <Settings2 size={15} /> Ministry categories
              </button>
            </div>
          )}
        </div>

        {!canReviewExpenses ? (
          <div className="p-5 text-sm text-stone-500">
            Expense history and receipts are limited to finance reviewers. Use the form above to submit an expense.
          </div>
        ) : loadingExpenses ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-stone-500">
            <Loader2 className="animate-spin" size={17} /> Loading expenses…
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-8 text-center text-sm text-stone-500">No expenses match this filter.</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredExpenses.map((expense) => (
              <article key={expense.id} className="space-y-3 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-stone-900">{expense.description}</p>
                    <p className="mt-1 text-sm text-stone-500">
                      {expense.mainCategory}{expense.subcategory ? ` · ${expense.subcategory}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-stone-400">
                      {expense.date || 'No date'} · Submitted by {expense.submittedBy || 'Unknown'}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-lg font-bold tabular-nums text-stone-900">{money(amountValue(expense.amount))}</p>
                    <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      expense.status === 'approved' ? 'bg-emerald-50 text-emerald-700'
                        : expense.status === 'rejected' ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-800'
                    }`}>
                      {expense.status || 'pending'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-500">
                  {expense.payee && <span>Payee: {expense.payee}</span>}
                  {expense.fund && <span>Fund: {expense.fund}</span>}
                  {expense.paymentMethod && <span>Paid by: {expense.paymentMethod}</span>}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {canReviewExpenses && expense.receiptKey && (
                    <button
                      type="button"
                      onClick={() => openReceipt(expense)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-stone-200 px-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                    >
                      <ReceiptText size={15} /> Download receipt
                    </button>
                  )}
                  {canReviewExpenses && expense.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        disabled={reviewingId === expense.id}
                        onClick={() => reviewExpense(expense, 'approved')}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                      >
                        {reviewingId === expense.id ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />}
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={reviewingId === expense.id}
                        onClick={() => reviewExpense(expense, 'rejected')}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-200 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                      >
                        <X size={15} /> Reject
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[94dvh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-stone-100 bg-white/95 p-4 backdrop-blur sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Lifegate Finance</p>
                <h2 className="mt-1 text-xl font-bold text-stone-900">Expense submission</h2>
                <p className="mt-1 text-sm text-stone-500">Submit an expense for finance review.</p>
              </div>
              <button
                type="button"
                onClick={resetForm}
                aria-label="Close expense form"
                className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full text-stone-500 hover:bg-stone-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submitExpense} className="space-y-4 p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Expense date">
                  <input required type="date" value={form.date} onChange={(event) => updateForm('date', event.target.value)} className={dateAmountInputClass} />
                </FormField>
                <FormField label="Amount (USD)">
                  <input required type="number" inputMode="decimal" min="0.01" step="0.01" value={form.amount} onChange={(event) => updateForm('amount', event.target.value)} placeholder="0.00" className={dateAmountInputClass} />
                </FormField>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Expense area">
                  <select
                    value={form.mainCategory}
                    onChange={(event) => {
                      const nextGroup = groups.find((group) => group.name === event.target.value);
                      setForm((current) => ({
                        ...current,
                        mainCategory: event.target.value,
                        subcategory: nextGroup?.subcategories[0] || '',
                      }));
                    }}
                    className={inputClass}
                  >
                    {groups.map((group) => <option key={group.name} value={group.name}>{group.name}</option>)}
                  </select>
                </FormField>
                <FormField label={form.mainCategory === 'Ministries' ? 'Ministry category' : 'Expense type'}>
                  <select
                    required={form.mainCategory === 'Ministries'}
                    value={form.subcategory}
                    onChange={(event) => updateForm('subcategory', event.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select a category</option>
                    {selectedGroup.subcategories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </FormField>
              </div>

              <FormField label="Description">
                <textarea required maxLength={500} rows={3} value={form.description} onChange={(event) => updateForm('description', event.target.value)} placeholder="What was purchased or paid for?" className={`${inputClass} min-h-24 resize-y`} />
              </FormField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Payee or supplier (optional)">
                  <input value={form.payee} onChange={(event) => updateForm('payee', event.target.value)} className={inputClass} placeholder="Business or person" />
                </FormField>
                <FormField label="Fund or budget (optional)">
                  <input value={form.fund} onChange={(event) => updateForm('fund', event.target.value)} className={inputClass} placeholder="e.g. General Fund" />
                </FormField>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Payment method (optional)">
                  <select value={form.paymentMethod} onChange={(event) => updateForm('paymentMethod', event.target.value)} className={inputClass}>
                    <option value="">Select method</option>
                    <option>Cash</option><option>Check</option><option>Debit/Credit Card</option>
                    <option>Bank Transfer</option><option>Other</option>
                  </select>
                </FormField>
                <FormField label="Payment reference (optional)">
                  <input value={form.reference} onChange={(event) => updateForm('reference', event.target.value)} className={inputClass} placeholder="Check or transaction number" />
                </FormField>
              </div>

              <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-white text-teal-700 shadow-sm">
                    <FileText size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-stone-800">Receipt image</p>
                    <p className="mt-0.5 text-xs leading-5 text-stone-500">JPG, PNG, or WebP up to 10 MB. On mobile, choose the camera option to take a photo.</p>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  aria-label="Choose or photograph a receipt image"
                  onChange={handleReceiptSelect}
                  className="mt-3 block min-h-12 w-full cursor-pointer rounded-xl border border-stone-200 bg-white text-sm text-stone-600 file:mr-3 file:min-h-12 file:border-0 file:bg-stone-100 file:px-3 file:font-semibold file:text-stone-700"
                />
                {receiptFile && (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <img src={previewUrl} alt="Receipt preview" className="h-20 w-20 rounded-lg border border-stone-200 object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="break-all text-xs text-stone-600">{receiptFile.name}</p>
                      <button
                        type="button"
                        onClick={scanReceipt}
                        disabled={scanning}
                        className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl border border-teal-200 bg-white px-3 text-sm font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-60"
                      >
                        {scanning ? <Loader2 size={15} className="animate-spin" /> : <ScanLine size={15} />}
                        {scanning ? `Scanning ${scanProgress}%` : 'Scan and suggest details'}
                      </button>
                      <p className="mt-1 text-[11px] text-stone-500">Scanning happens in your browser. Review all suggested fields before submitting.</p>
                    </div>
                  </div>
                )}
              </div>

              {receiptError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{receiptError}</p>}

              <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-stone-100 bg-white/95 p-4 backdrop-blur sm:-mx-6 sm:flex-row sm:justify-end sm:px-6">
                <button type="button" onClick={resetForm} className="min-h-12 rounded-xl border border-stone-200 px-5 text-sm font-semibold text-stone-700 hover:bg-stone-50">Cancel</button>
                <button type="submit" disabled={submitting || scanning} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60">
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                  {submitting ? 'Submitting…' : 'Submit expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {categorySettingsOpen && canReviewExpenses && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/60 p-0 sm:items-center sm:p-4">
          <div className="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-900">Ministry categories</h2>
              <button type="button" onClick={() => setCategorySettingsOpen(false)} aria-label="Close categories" className="grid h-10 w-10 place-items-center rounded-full hover:bg-stone-100"><X size={19} /></button>
            </div>
            <p className="mt-1 text-sm text-stone-500">Add categories to organize ministry spending. New choices appear in the expense form.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {ministryCategories.map((category) => (
                <span key={category} className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-800">
                  <CheckCircle2 size={14} /> {category}
                </span>
              ))}
            </div>
            <form onSubmit={saveMinistryCategory} className="mt-5 space-y-3">
              <FormField label="New category">
                <input maxLength={60} value={newCategory} onChange={(event) => setNewCategory(event.target.value)} className={inputClass} placeholder="e.g. Youth" />
              </FormField>
              <button type="submit" disabled={!newCategory.trim() || savingCategory} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white disabled:opacity-50">
                {savingCategory ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                Add ministry category
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
