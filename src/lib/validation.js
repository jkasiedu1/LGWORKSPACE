const VALID_PERSON_TYPES = new Set(['Member', 'Volunteer', 'Staff', 'First Time', 'Returning', 'Guest', 'Child']);

const VALID_INTAKE_TYPES = new Set(['Member', 'Volunteer', 'First Time', 'Returning', 'Guest', 'Child']);

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
