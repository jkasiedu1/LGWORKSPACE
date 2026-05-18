import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, deleteField, doc, increment, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  logPersonCreated,
  logPersonDeleted,
  logCheckInStatusChanged,
  logEventCreated,
  logEventDeleted,
  logGivingRecorded,
} from './auditService';

const RETRYABLE_ERROR_CODES = new Set([
  'aborted',
  'cancelled',
  'deadline-exceeded',
  'failed-precondition',
  'internal',
  'resource-exhausted',
  'unavailable',
  'unknown',
]);

function withAuditFields(data) {
  return {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function withUpdatedAuditFields(data) {
  return {
    ...data,
    updatedAt: serverTimestamp(),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorCode(error) {
  const raw = String(error?.code || '').toLowerCase();
  if (!raw) return '';
  return raw.startsWith('firestore/') ? raw.replace('firestore/', '') : raw;
}

function isRetryableError(error) {
  const code = getErrorCode(error);
  if (!code) return false;
  return RETRYABLE_ERROR_CODES.has(code);
}

async function withRetry(operation, { retries = 2, baseDelayMs = 300 } = {}) {
  let attempt = 0;
  let lastError;

  while (attempt <= retries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === retries || !isRetryableError(error)) {
        throw error;
      }
      await sleep(Math.min(baseDelayMs * (attempt + 1), 5000));
      attempt += 1;
    }
  }

  throw lastError;
}

export async function createPerson(person, actorEmail) {
  if (!db) {
    return { id: Date.now(), ...person };
  }

  const docRef = await withRetry(() => addDoc(collection(db, 'people'), withAuditFields(person)));

  if (actorEmail) {
    logPersonCreated(actorEmail, docRef.id, person).catch((err) =>
      console.error('[createPerson] Audit logging failed:', err)
    );
  }

  return { id: docRef.id, ...person };
}

export async function createPeopleBulk(people, actorEmail) {
  if (!Array.isArray(people) || people.length === 0) {
    return [];
  }

  if (!db) {
    return people.map((person, index) => ({ id: Date.now() + index, ...person }));
  }

  const createdPeople = await withRetry(async () => {
    const batch = writeBatch(db);
    const results = people.map((person) => {
      const docRef = doc(collection(db, 'people'));
      batch.set(docRef, withAuditFields(person));
      return { id: docRef.id, ...person };
    });

    await batch.commit();
    return results;
  });

  if (actorEmail) {
    createdPeople.forEach((person) => {
      logPersonCreated(actorEmail, person.id, person).catch((err) =>
        console.error('[createPeopleBulk] Audit logging failed:', err)
      );
    });
  }

  return createdPeople;
}

export async function createDirectoryIntakeSubmission(submission) {
  if (!db) {
    return { id: Date.now(), ...submission, status: 'pending' };
  }

  const payload = {
    ...submission,
    status: 'pending',
    source: submission?.source || 'member-form',
  };

  const docRef = await withRetry(() => addDoc(collection(db, 'directoryIntakeSubmissions'), withAuditFields(payload)));
  return { id: docRef.id, ...payload };
}

function generateSecurityCode() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const cap = Math.floor(256 / 36) * 36;
  const buf = new Uint8Array(64);
  let code = '';
  while (code.length < 4) {
    crypto.getRandomValues(buf);
    for (let i = 0; i < buf.length && code.length < 4; i += 1) {
      if (buf[i] < cap) code += chars[buf[i] % 36];
    }
  }
  return code;
}

export async function approveDirectoryIntakeSubmission(submissionId, submissionData, actorEmail) {
  if (!db) {
    return {
      id: submissionId,
      linkedPersonId: Date.now(),
      status: 'approved',
    };
  }

  const isChildSubmission = submissionData.type === 'Child';
  const personRef = doc(collection(db, 'people'));
  const submissionRef = doc(db, 'directoryIntakeSubmissions', submissionId);
  const personPayload = {
    firstName: submissionData.firstName || '',
    lastName: submissionData.lastName || '',
    name: `${submissionData.firstName || ''} ${submissionData.lastName || ''}`.trim(),
    email: isChildSubmission ? '' : (submissionData.email || ''),
    phone: isChildSubmission ? '' : (submissionData.phone || ''),
    address: submissionData.address || '',
    type: submissionData.type || 'Member',
    gender: submissionData.gender || 'Female',
    bgCheck: isChildSubmission ? '' : 'N/A',
    parents: submissionData.parents || '',
    parentPhone: submissionData.parentPhone || '',
    allergies: submissionData.allergies || '',
    securityCode: isChildSubmission ? generateSecurityCode() : '',
    checkInStatus: isChildSubmission ? 'Signed Out' : '',
    intakeSource: 'member-template',
  };

  await withRetry(async () => {
    const batch = writeBatch(db);
    batch.set(personRef, withAuditFields(personPayload));
    batch.update(submissionRef, {
      status: 'approved',
      linkedPersonId: personRef.id,
      approvedBy: actorEmail || '',
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  });

  if (actorEmail) {
    logPersonCreated(actorEmail, personRef.id, personPayload).catch((err) =>
      console.error('[approveDirectoryIntakeSubmission] Audit logging failed:', err)
    );
  }

  return {
    id: submissionId,
    linkedPersonId: personRef.id,
    status: 'approved',
  };
}

export async function rejectDirectoryIntakeSubmission(submissionId, actorEmail) {
  if (!db) {
    return { id: submissionId, status: 'rejected', reviewedBy: actorEmail || '' };
  }

  await withRetry(() => updateDoc(doc(db, 'directoryIntakeSubmissions', submissionId), {
    status: 'rejected',
    reviewedBy: actorEmail || '',
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));

  return { id: submissionId, status: 'rejected' };
}

export async function updatePersonProfile(personId, updates) {
  if (!db) {
    return { id: personId, ...updates };
  }

  await withRetry(() => updateDoc(doc(db, 'people', personId), withUpdatedAuditFields(updates)));
  return { id: personId, ...updates };
}

export async function deletePerson(personId, personData, actorEmail) {
  if (!db) {
    return;
  }

  await withRetry(() => deleteDoc(doc(db, 'people', personId)));

  if (actorEmail && personData) {
    logPersonDeleted(actorEmail, personId, personData).catch((err) =>
      console.error('[deletePerson] Audit logging failed:', err)
    );
  }
}

export async function updatePersonCheckInStatus(personId, checkInStatus, parentName, actorEmail) {
  if (!db) {
    return { id: personId, checkInStatus };
  }

  await withRetry(() => updateDoc(doc(db, 'people', personId), withUpdatedAuditFields({ checkInStatus })));

  if (actorEmail) {
    logCheckInStatusChanged(actorEmail, personId, checkInStatus, parentName).catch((err) =>
      console.error('[updatePersonCheckInStatus] Audit logging failed:', err)
    );
  }

  return { id: personId, checkInStatus };
}

export async function createEvent(event, actorEmail) {
  if (!db) {
    return { id: Date.now(), ...event };
  }

  const docRef = await withRetry(() => addDoc(collection(db, 'events'), withAuditFields(event)));

  if (actorEmail) {
    logEventCreated(actorEmail, docRef.id, event).catch((err) =>
      console.error('[createEvent] Audit logging failed:', err)
    );
  }

  return { id: docRef.id, ...event };
}

export async function deleteEvent(eventId, eventData, actorEmail) {
  if (!db) return;
  await withRetry(() => deleteDoc(doc(db, 'events', eventId)));

  if (actorEmail && eventData) {
    logEventDeleted(actorEmail, eventId, eventData).catch((err) =>
      console.error('[deleteEvent] Audit logging failed:', err)
    );
  }
}

export async function updateEvent(eventId, eventData, actorEmail) {
  if (!db) return;
  const { id: _id, ...fields } = eventData;
  await withRetry(() => updateDoc(doc(db, 'events', eventId), { ...fields, updatedAt: serverTimestamp() }));
}

export async function createDonation(donation, actorEmail) {
  if (!db) return { id: Date.now(), ...donation };
  const docRef = await withRetry(() => addDoc(collection(db, 'donations'), withAuditFields(donation)));

  if (actorEmail) {
    logGivingRecorded(actorEmail, docRef.id, donation).catch((err) =>
      console.error('[createDonation] Audit logging failed:', err)
    );
  }

  return { id: docRef.id, ...donation };
}

export async function deleteDonation(donationId, donationData, actorEmail) {
  if (!db) return;
  await withRetry(() => deleteDoc(doc(db, 'donations', donationId)));

  if (actorEmail && donationData) {
    logGivingRecorded(actorEmail, donationId, {
      ...donationData,
      action: 'DELETE',
    }).catch((err) =>
      console.error('[deleteDonation] Audit logging failed:', err)
    );
  }
}

export async function createSong(song) {
  if (!db) return { id: Date.now(), ...song };
  const docRef = await withRetry(() => addDoc(collection(db, 'songs'), withAuditFields(song)));
  return { id: docRef.id, ...song };
}

export async function updateSong(songId, updates) {
  if (!db) return { id: songId, ...updates };
  await withRetry(() => updateDoc(doc(db, 'songs', songId), withUpdatedAuditFields(updates)));
  return { id: songId, ...updates };
}

export async function deleteSong(songId) {
  if (!db) return;
  await withRetry(() => deleteDoc(doc(db, 'songs', songId)));
}

const VALID_VOCAL_PARTS = new Set(['soprano', 'alto', 'tenor', 'bass', 'fullMix']);

export async function updateSongVocalPart(songId, part, partData) {
  if (!db) return;
  if (!VALID_VOCAL_PARTS.has(part)) throw new Error(`Invalid vocal part: ${part}`);
  await withRetry(() =>
    updateDoc(doc(db, 'songs', songId), withUpdatedAuditFields({ [`vocalParts.${part}`]: partData }))
  );
}

export async function removeSongVocalPart(songId, part) {
  if (!db) return;
  if (!VALID_VOCAL_PARTS.has(part)) throw new Error(`Invalid vocal part: ${part}`);
  await withRetry(() =>
    updateDoc(doc(db, 'songs', songId), {
      [`vocalParts.${part}`]: deleteField(),
      updatedAt: serverTimestamp(),
    })
  );
}

export async function createSongAnalysis(songId, analysis) {
  if (!db) return { id: Date.now(), ...analysis };
  const docRef = await withRetry(() =>
    addDoc(collection(db, 'songs', songId, 'analyses'), withAuditFields(analysis))
  );
  return { id: docRef.id, ...analysis };
}

export async function updateSongAnalysis(songId, analysisId, updates) {
  if (!db) return;
  await withRetry(() => updateDoc(doc(db, 'songs', songId, 'analyses', analysisId), withAuditFields(updates)));
}

export async function deleteSongAnalysis(songId, analysisId) {
  if (!db) return;
  await withRetry(() => deleteDoc(doc(db, 'songs', songId, 'analyses', analysisId)));
}

export function subscribeSongAnalyses(songId, callback) {
  if (!db) { callback([]); return () => {}; }
  const q = query(
    collection(db, 'songs', songId, 'analyses'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function createWorkflow(workflow) {
  if (!db) return { id: Date.now(), ...workflow };
  const docRef = await withRetry(() => addDoc(collection(db, 'workflows'), withAuditFields(workflow)));
  return { id: docRef.id, ...workflow };
}

export async function updateWorkflow(workflowId, workflow) {
  if (!db) return { id: workflowId, ...workflow };
  await withRetry(() => updateDoc(doc(db, 'workflows', workflowId), withUpdatedAuditFields(workflow)));
  return { id: workflowId, ...workflow };
}

export async function deleteWorkflow(workflowId) {
  if (!db) return;
  await withRetry(() => deleteDoc(doc(db, 'workflows', workflowId)));
}

export async function createCommunityPost(post) {
  if (!db) return { id: Date.now(), ...post };
  const docRef = await withRetry(() => addDoc(collection(db, 'communityPosts'), withAuditFields(post)));
  return { id: docRef.id, ...post };
}

export async function updateCommunityPost(postId, updates) {
  if (!db) return { id: postId, ...updates };
  await withRetry(() => updateDoc(doc(db, 'communityPosts', postId), withUpdatedAuditFields(updates)));
  return { id: postId, ...updates };
}

export async function deleteCommunityPost(postId) {
  if (!db) return;
  await withRetry(() => deleteDoc(doc(db, 'communityPosts', postId)));
}

export async function togglePostReaction(postId, uid, reactionType) {
  if (!db) return;
  const ref = doc(db, 'communityPosts', postId);
  const field = `reactions.${reactionType}`;
  // Check happens client-side; server just applies the union/remove
  return { ref, field };
}

export async function addPostReaction(postId, uid, reactionType) {
  if (!db) return;
  await withRetry(() => updateDoc(doc(db, 'communityPosts', postId), {
    [`reactions.${reactionType}`]: arrayUnion(uid),
  }));
}

export async function removePostReaction(postId, uid, reactionType) {
  if (!db) return;
  await withRetry(() => updateDoc(doc(db, 'communityPosts', postId), {
    [`reactions.${reactionType}`]: arrayRemove(uid),
  }));
}

export async function addCommentToPost(postId, comment) {
  if (!db) return;
  await withRetry(() => updateDoc(doc(db, 'communityPosts', postId), {
    commentList: arrayUnion(comment),
    comments: increment(1),
  }));
}

export async function createStory(story) {
  if (!db) return { id: Date.now(), ...story };
  const docRef = await withRetry(() => addDoc(collection(db, 'communityStories'), withAuditFields(story)));
  return { id: docRef.id, ...story };
}

export async function createTeamPortal(team) {
  if (!db) return { id: Date.now(), ...team };
  const docRef = await withRetry(() => addDoc(collection(db, 'teams'), withAuditFields(team)));
  return { id: docRef.id, ...team };
}

export async function updateTeamPortal(teamId, updates) {
  if (!db) return { id: teamId, ...updates };
  await withRetry(() => updateDoc(doc(db, 'teams', teamId), withUpdatedAuditFields(updates)));
  return { id: teamId, ...updates };
}

export async function saveSecuritySettings(settings) {
  if (!db) return settings;
  await withRetry(() => setDoc(doc(db, 'settings', 'security'), withUpdatedAuditFields(settings), { merge: true }));
  return settings;
}

export async function saveServicePlan(plan) {
  if (!db) return plan;
  await withRetry(() => setDoc(doc(db, 'settings', 'servicePlan'), withUpdatedAuditFields(plan), { merge: true }));
  return plan;
}

export async function createCommunityMessage(message) {
  if (!db) return { id: Date.now(), ...message };
  const docRef = await withRetry(() => addDoc(collection(db, 'communityMessages'), withAuditFields(message)));
  return { id: docRef.id, ...message };
}

export async function createTeamMessage(message) {
  if (!db) return { id: Date.now(), ...message };
  const docRef = await withRetry(() => addDoc(collection(db, 'teamMessages'), withAuditFields(message)));
  return { id: docRef.id, ...message };
}

export async function createWorkflowKeyword(keyword) {
  if (!db) return { id: Date.now(), ...keyword };
  const docRef = await withRetry(() => addDoc(collection(db, 'workflowKeywords'), withAuditFields(keyword)));
  return { id: docRef.id, ...keyword };
}

export async function deleteWorkflowKeyword(keywordId) {
  if (!db) return;
  await withRetry(() => deleteDoc(doc(db, 'workflowKeywords', keywordId)));
}

export async function createWorkflowInboxMessage(message) {
  if (!db) return { id: Date.now(), ...message };
  const docRef = await withRetry(() => addDoc(collection(db, 'workflowInboxMessages'), withAuditFields(message)));
  return { id: docRef.id, ...message };
}
