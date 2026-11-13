import { useState } from 'react';

const GUEST_AGE_BRACKETS = ['Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+', 'Prefer not to say'];
const CHILD_AGE_BRACKETS = ['Under 5', '5-12', '13-17'];
const INPUT_CLASS = 'block h-12 w-full min-w-0 box-border rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100';

function getToday() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

export function createChurchCareGuestForm() {
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

function IntakeField({ label, children }) {
  return (
    <label className="block min-w-0 space-y-1.5 text-sm text-stone-700">
      <span className="font-semibold">{label}</span>
      {children}
    </label>
  );
}

export default function ChurchCareGuestFields({ form, onChange, internal = false }) {
  const [contactLabel, contactHint] = internal
    ? [
      'They agreed Lifegate may contact them using the phone number or email provided.',
      'Optional. A first follow-up reminder will be scheduled only when this is checked.',
    ]
    : [
      'Lifegate may contact me about my visit using the phone number or email I provided.',
      'Optional. If unchecked, your information can still be submitted, but we will not schedule a follow-up reminder.',
    ];

  const changeChildCount = (value) => {
    const count = Number(value);
    onChange('childAgeBrackets', Array.from(
      { length: count },
      (_, index) => form.childAgeBrackets[index] || ''
    ));
  };

  const updateChildAge = (index, ageBracket) => {
    onChange('childAgeBrackets', form.childAgeBrackets.map((currentBracket, childIndex) => (
      childIndex === index ? ageBracket : currentBracket
    )));
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <IntakeField label="First name">
          <input required maxLength={80} autoComplete="given-name" value={form.firstName} onChange={(event) => onChange('firstName', event.target.value)} className={INPUT_CLASS} />
        </IntakeField>
        <IntakeField label="Last name">
          <input required maxLength={80} autoComplete="family-name" value={form.lastName} onChange={(event) => onChange('lastName', event.target.value)} className={INPUT_CLASS} />
        </IntakeField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <IntakeField label="Phone (or email)">
          <input type="tel" maxLength={30} autoComplete="tel" value={form.phone} onChange={(event) => onChange('phone', event.target.value)} className={INPUT_CLASS} />
        </IntakeField>
        <IntakeField label="Email (or phone)">
          <input type="email" maxLength={254} autoComplete="email" value={form.email} onChange={(event) => onChange('email', event.target.value)} className={INPUT_CLASS} />
        </IntakeField>
      </div>
      <p className="-mt-3 text-xs text-stone-500">Please provide at least one way for our team to reach you.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <IntakeField label="Visit date">
          <input required type="date" value={form.firstVisitDate} onChange={(event) => onChange('firstVisitDate', event.target.value)} className={INPUT_CLASS} />
        </IntakeField>
        <IntakeField label="Age bracket">
          <select required value={form.ageBracket} onChange={(event) => onChange('ageBracket', event.target.value)} className={INPUT_CLASS}>
            <option value="">Select age</option>
            {GUEST_AGE_BRACKETS.map((age) => <option key={age} value={age}>{age}</option>)}
          </select>
        </IntakeField>
        <IntakeField label="Gender">
          <select required value={form.gender} onChange={(event) => onChange('gender', event.target.value)} className={INPUT_CLASS}>
            <option value="">Select gender</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </select>
        </IntakeField>
      </div>

      <IntakeField label="Who invited you? (optional)">
        <input maxLength={120} value={form.invitedBy} onChange={(event) => onChange('invitedBy', event.target.value)} className={INPUT_CLASS} placeholder="Name of the person who invited you" />
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
        <textarea maxLength={1000} rows={4} value={form.prayerRequest} onChange={(event) => onChange('prayerRequest', event.target.value)} className={`${INPUT_CLASS} min-h-28 resize-y`} placeholder="Share anything you would like our team to pray about." />
      </IntakeField>
      <p className="-mt-3 text-right text-xs text-stone-400">{form.prayerRequest.length}/1000</p>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 p-4 text-sm text-stone-700">
        <input type="checkbox" checked={form.contactConsent} onChange={(event) => onChange('contactConsent', event.target.checked)} className="mt-1 accent-teal-700" />
        <span>
          {contactLabel}
          <span className="mt-1 block text-xs text-stone-500">{contactHint}</span>
        </span>
      </label>
    </>
  );
}
