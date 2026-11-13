const VALID_PERSON_TYPES = new Set(['Member', 'Volunteer', 'Staff', 'First Time', 'Returning', 'Guest', 'Child']);

const VALID_INTAKE_TYPES = new Set(['Member', 'Volunteer', 'First Time', 'Returning', 'Guest', 'Child']);
const GUEST_AGE_BRACKETS = new Set(['Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+', 'Prefer not to say']);
const CHILD_AGE_BRACKETS = new Set(['Under 5', '5-12', '13-17']);
const VALID_GENDERS = new Set(['Female', 'Male']);

export function validateChurchCareGuestIntake(submission) {
  if (!submission?.firstName?.trim()) {
    return { valid: false, message: 'First name is required.' };
  }
  if (!submission?.lastName?.trim()) {
    return { valid: false, message: 'Last name is required.' };
  }
  if (!submission?.phone?.trim() && !submission?.email?.trim()) {
    return { valid: false, message: 'Please provide a phone number or email address.' };
  }
  if (submission?.email && !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(submission.email.trim())) {
    return { valid: false, message: 'Email address format is invalid.' };
  }
  if (!GUEST_AGE_BRACKETS.has(submission?.ageBracket)) {
    return { valid: false, message: 'Select an age bracket.' };
  }
  if (!VALID_GENDERS.has(submission?.gender)) {
    return { valid: false, message: 'Select Male or Female.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(submission?.firstVisitDate || '')) {
    return { valid: false, message: 'Enter a valid visit date.' };
  }
  const [year, month, day] = submission.firstVisitDate.split('-').map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(parsedDate.getTime())
    || parsedDate.getUTCFullYear() !== year
    || parsedDate.getUTCMonth() !== month - 1
    || parsedDate.getUTCDate() !== day
  ) {
    return { valid: false, message: 'Enter a valid visit date.' };
  }
  if (!Array.isArray(submission?.childAgeBrackets) || submission.childAgeBrackets.length > 10) {
    return { valid: false, message: 'Enter no more than 10 children.' };
  }
  if (submission.childAgeBrackets.some((ageBracket) => !CHILD_AGE_BRACKETS.has(ageBracket))) {
    return { valid: false, message: 'Select an age bracket for each child.' };
  }
  if (typeof submission?.invitedBy !== 'string' || submission.invitedBy.length > 120) {
    return { valid: false, message: 'The inviter name must be 120 characters or fewer.' };
  }
  if (typeof submission?.prayerRequest !== 'string' || submission.prayerRequest.length > 1000) {
    return { valid: false, message: 'Prayer requests must be 1,000 characters or fewer.' };
  }
  if (typeof submission?.contactConsent !== 'boolean') {
    return { valid: false, message: 'Choose whether Lifegate may contact you about your visit.' };
  }

  return { valid: true };
}

export function validatePersonProfile(person) {
  if (!person?.firstName?.trim()) {
    return { valid: false, message: 'First name is required.' };
  }

  if (!person?.lastName?.trim()) {
    return { valid: false, message: 'Last name is required.' };
  }

  if (!VALID_PERSON_TYPES.has(person.type)) {
    return { valid: false, message: 'Invalid profile type selected.' };
  }

  if (person.type === 'Child') {
    if (!person?.parents?.trim()) {
      return { valid: false, message: 'Parent or guardian name is required for child profiles.' };
    }

    if (!person?.parentPhone?.trim()) {
      return { valid: false, message: 'Parent phone number is required for child profiles.' };
    }
  }

  if (person?.email && !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(person.email)) {
    return { valid: false, message: 'Email address format is invalid.' };
  }

  return { valid: true };
}

export function validateCalendarEvent(event) {
  if (!event?.title?.trim()) {
    return { valid: false, message: 'Event title is required.' };
  }

  if (!event?.date?.trim()) {
    return { valid: false, message: 'Event date is required.' };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
    return { valid: false, message: 'Event date must be in YYYY-MM-DD format.' };
  }

  const parsed = new Date(event.date + 'T00:00:00');
  if (isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== event.date) {
    return { valid: false, message: 'Event date is not a valid calendar date.' };
  }

  if (event?.time && !/^\d{2}:\d{2}$/.test(event.time)) {
    return { valid: false, message: 'Event time must be in HH:MM format.' };
  }

  return { valid: true };
}

export function validateDirectoryIntakeSubmission(submission) {
  if (!submission?.firstName?.trim()) {
    return { valid: false, message: 'First name is required.' };
  }

  if (!submission?.lastName?.trim()) {
    return { valid: false, message: 'Last name is required.' };
  }

  if (!VALID_INTAKE_TYPES.has(submission?.type)) {
    return { valid: false, message: 'Please select a valid profile type.' };
  }

  if (submission?.type === 'Child') {
    if (!submission?.parents?.trim()) {
      return { valid: false, message: 'Parent or guardian name is required for child submissions.' };
    }

    if (!submission?.parentPhone?.trim()) {
      return { valid: false, message: 'Parent phone number is required for child submissions.' };
    }
  }

  if (submission?.type !== 'Child' && !submission?.phone?.trim() && !submission?.email?.trim()) {
    return { valid: false, message: 'Please provide at least an email or phone number.' };
  }

  if (submission?.email && !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(submission.email)) {
    return { valid: false, message: 'Email address format is invalid.' };
  }

  return { valid: true };
}
