import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logPersonCreated } from './auditService';

const FOLLOW_UP_DAYS = [1, 7, 21];
const VALID_STAGES = new Set(['new', 'contacted', 'connected', 'ready-to-join']);

function dateAfterDays(days) {
  return Timestamp.fromDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
}

function activityPayload(type, note, actor) {
  return {
    type,
    note,
    actorUid: actor?.uid || '',
    actorEmail: actor?.email || '',
    createdAt: serverTimestamp(),
  };
}

function getActivityRef(visitorId) {
  return doc(collection(db, 'churchCareVisitors', String(visitorId), 'activities'));
}

export async function createChurchCareVisitor(visitor, actor) {
  if (!db) {
    return { id: `local-${Date.now()}`, ...visitor, status: 'active' };
  }

  const visitorRef = doc(collection(db, 'churchCareVisitors'));
  const batch = writeBatch(db);
  batch.set(visitorRef, {
    ...visitor,
    assignedTeamMemberId: '',
    status: 'active',
    stage: 'new',
    followUpStep: 0,
    nextFollowUpAt: visitor.contactConsent ? dateAfterDays(FOLLOW_UP_DAYS[0]) : null,
    lastContactedAt: null,
    createdByUid: actor?.uid || '',
    createdByEmail: actor?.email || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(getActivityRef(visitorRef.id), activityPayload('created', 'Added to Church Care.', actor));
  await batch.commit();
  return { id: visitorRef.id, ...visitor, status: 'active' };
}

export async function updateChurchCareVisitor(visitorId, currentVisitor, updates, actor) {
  const firstName = String(updates.firstName || '').trim();
  const lastName = String(updates.lastName || '').trim();
  const email = String(updates.email || '').trim();
  const phone = String(updates.phone || '').trim();
  if (!firstName || !lastName) {
    throw new Error('First and last name are required.');
  }
  if (!email && !phone) {
    throw new Error('Add an email address or phone number.');
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Enter a valid email address.');
  }

  if (!db) return;

  const contactConsent = Boolean(updates.contactConsent);
  const followUpStep = Number.isInteger(currentVisitor.followUpStep) ? currentVisitor.followUpStep : 0;
  const nextFollowUpAt = !contactConsent
    ? null
    : !currentVisitor.contactConsent && FOLLOW_UP_DAYS[followUpStep]
      ? dateAfterDays(FOLLOW_UP_DAYS[followUpStep])
      : currentVisitor.nextFollowUpAt || null;
  const payload = {
    firstName,
    lastName,
    email,
    phone,
    firstVisitDate: String(updates.firstVisitDate || ''),
    contactConsent,
    nextFollowUpAt,
    updatedAt: serverTimestamp(),
  };
  const batch = writeBatch(db);
  batch.update(doc(db, 'churchCareVisitors', String(visitorId)), payload);
  batch.set(
    getActivityRef(visitorId),
    activityPayload('guest_updated', 'Updated visitor contact information or contact permission.', actor)
  );
  await batch.commit();
}

export async function updateChurchCareStage(visitorId, stage, actor) {
  if (!VALID_STAGES.has(stage)) {
    throw new Error('Choose a valid care stage.');
  }
  if (!db) return;

  const batch = writeBatch(db);
  batch.update(doc(db, 'churchCareVisitors', String(visitorId)), {
    stage,
    updatedAt: serverTimestamp(),
  });
  batch.set(getActivityRef(visitorId), activityPayload('stage_changed', `Care stage changed to ${stage}.`, actor));
  await batch.commit();
}

export async function assignChurchCareTeamMember(visitorId, member, actor) {
  if (member && !['Member', 'Staff', 'Volunteer'].includes(member.type)) {
    throw new Error('Choose a member, staff person, or volunteer from the directory.');
  }
  if (!db) return;

  const visitorRef = doc(db, 'churchCareVisitors', String(visitorId));
  const activityRef = getActivityRef(visitorId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(visitorRef);
    if (!snapshot.exists()) {
      throw new Error('This visitor record no longer exists.');
    }
    if (snapshot.data().status !== 'active') {
      throw new Error('Only active visitor records can be assigned.');
    }

    transaction.update(visitorRef, {
      assignedTeamMemberId: member ? String(member.id) : '',
      updatedAt: serverTimestamp(),
    });
    transaction.set(
      activityRef,
      activityPayload('assigned', member ? `Assigned follow-up to ${member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim()}.` : 'Removed the follow-up assignment.', actor)
    );
  });
}

export async function updateChurchCareFollowUpDate(visitorId, dateValue, actor) {
  if (!db) return;

  const nextFollowUpAt = dateValue
    ? Timestamp.fromDate(new Date(`${dateValue}T12:00:00`))
    : null;
  const batch = writeBatch(db);
  batch.update(doc(db, 'churchCareVisitors', String(visitorId)), {
    nextFollowUpAt,
    updatedAt: serverTimestamp(),
  });
  batch.set(
    getActivityRef(visitorId),
    activityPayload('due_date_updated', dateValue ? `Next follow-up set for ${dateValue}.` : 'Next follow-up removed.', actor)
  );
  await batch.commit();
}

export async function recordChurchCareFollowUp(visitorId, note, actor) {
  if (!db) return;

  const visitorRef = doc(db, 'churchCareVisitors', String(visitorId));
  const activityRef = getActivityRef(visitorId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(visitorRef);
    if (!snapshot.exists()) {
      throw new Error('This visitor record no longer exists.');
    }

    const visitor = snapshot.data();
    if (visitor.status !== 'active') {
      throw new Error('Only active visitor records can receive follow-ups.');
    }
    if (!visitor.contactConsent) {
      throw new Error('Contact permission is not recorded for this visitor.');
    }

    const currentStep = Number.isInteger(visitor.followUpStep) ? visitor.followUpStep : 0;
    const nextStep = currentStep + 1;
    const nextDueDays = FOLLOW_UP_DAYS[nextStep];
    transaction.update(visitorRef, {
      stage: visitor.stage === 'new' ? 'contacted' : visitor.stage,
      followUpStep: nextStep,
      nextFollowUpAt: nextDueDays ? dateAfterDays(nextDueDays) : null,
      lastContactedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.set(activityRef, activityPayload('follow_up', note.trim(), actor));
  });
}

export async function setChurchCareArchived(visitorId, archived, actor) {
  if (!db) return;

  const batch = writeBatch(db);
  batch.update(doc(db, 'churchCareVisitors', String(visitorId)), {
    status: archived ? 'archived' : 'active',
    updatedAt: serverTimestamp(),
  });
  batch.set(
    getActivityRef(visitorId),
    activityPayload(archived ? 'archived' : 'restored', archived ? 'Visitor record archived.' : 'Visitor record restored.', actor)
  );
  await batch.commit();
}

export async function moveChurchCareVisitorToDirectory(visitorId, actor) {
  if (!db) {
    throw new Error('The church directory is unavailable.');
  }

  const visitorRef = doc(db, 'churchCareVisitors', String(visitorId));
  const personRef = doc(collection(db, 'people'));
  const activityRef = getActivityRef(visitorId);
  let personPayload;

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(visitorRef);
    if (!snapshot.exists()) {
      throw new Error('This visitor record no longer exists.');
    }

    const visitor = snapshot.data();
    if (visitor.status !== 'active' || visitor.stage !== 'ready-to-join') {
      throw new Error('Mark this person as ready to join before moving them to the directory.');
    }

    personPayload = {
      firstName: visitor.firstName || '',
      lastName: visitor.lastName || '',
      name: `${visitor.firstName || ''} ${visitor.lastName || ''}`.trim(),
      email: visitor.email || '',
      phone: visitor.phone || '',
      address: '',
      type: 'Member',
      bgCheck: 'N/A',
      parents: '',
      parentPhone: '',
      allergies: '',
      securityCode: '',
      checkInStatus: '',
      intakeSource: 'church-care',
      sourceChurchCareVisitorId: String(visitorId),
    };

    transaction.set(personRef, {
      ...personPayload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.update(visitorRef, {
      status: 'converted',
      migratedPersonId: personRef.id,
      convertedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.set(activityRef, activityPayload('converted', 'Moved to the church directory after deciding to join.', actor));
  });

  if (actor?.email) {
    logPersonCreated(actor.email, personRef.id, personPayload).catch((error) => {
      console.error('[moveChurchCareVisitorToDirectory] Audit logging failed:', error);
    });
  }

  return { personId: personRef.id };
}

export function subscribeToChurchCareActivities(visitorId, onData, onError) {
  if (!db) return () => {};
  return onSnapshot(
    query(collection(db, 'churchCareVisitors', String(visitorId), 'activities'), orderBy('createdAt', 'desc')),
    (snapshot) => onData(snapshot.docs.map((activityDoc) => ({ id: activityDoc.id, ...activityDoc.data() }))),
    onError
  );
}

export async function addChurchCareNote(visitorId, note, actor) {
  if (!db) return;
  await addDoc(
    collection(db, 'churchCareVisitors', String(visitorId), 'activities'),
    activityPayload('note', note.trim(), actor)
  );
}
