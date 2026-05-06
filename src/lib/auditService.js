import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Audit Log Service
 * Provides immutable logging for sensitive operations
 * All entries include: actor email, action type, timestamp, entity type, entity ID, details
 */

/**
 * Log an audit event to Firestore
 * @param {Object} params - Audit parameters
 * @param {string} params.actorEmail - Email of the person taking action
 * @param {string} params.actionType - Type of action (CREATE, UPDATE, DELETE, CHECK_IN, CHECK_OUT, etc.)
 * @param {string} params.entityType - Type of entity affected (PERSON, EVENT, DONATION, etc.)
 * @param {string} params.entityId - ID of the affected entity in Firestore
 * @param {Object} params.details - Additional context (before values, after values, reason, etc.)
 * @returns {Promise<string>} - Document ID of the audit log entry
 */
export async function logAuditEvent({
  actorEmail,
  actionType,
  entityType,
  entityId,
  details = {}
}) {
  try {
    if (!db) {
      console.warn('[AuditLog] Firestore not initialized; audit event not logged');
      return null;
    }

    const auditCollectionRef = collection(db, 'auditLogs');
    const docRef = await addDoc(auditCollectionRef, {
      actorEmail,
      actionType,
      entityType,
      entityId,
      details,
      createdAt: serverTimestamp(),
      timestamp: new Date().toISOString() // Backup timestamp for queries
    });

    console.log(`[AuditLog] ${actionType} on ${entityType} ${entityId} by ${actorEmail}`);
    return docRef.id;
  } catch (error) {
    console.error('[AuditLog] Failed to log audit event:', error);
    // Don't throw - audit logging failures should not block main operations
    return null;
  }
}

/**
 * Log a person creation
 */
export async function logPersonCreated(actorEmail, personId, personData) {
  return logAuditEvent({
    actorEmail,
    actionType: 'CREATE',
    entityType: 'PERSON',
    entityId: personId,
    details: {
      firstName: personData.firstName,
      lastName: personData.lastName,
      type: personData.type
    }
  });
}

/**
 * Log a person deletion
 */
export async function logPersonDeleted(actorEmail, personId, personData) {
  return logAuditEvent({
    actorEmail,
    actionType: 'DELETE',
    entityType: 'PERSON',
    entityId: personId,
    details: {
      firstName: personData.firstName,
      lastName: personData.lastName,
      reason: 'Person record removed'
    }
  });
}

/**
 * Log a check-in/check-out action
 */
export async function logCheckInStatusChanged(actorEmail, personId, isCheckedIn, parentName) {
  return logAuditEvent({
    actorEmail,
    actionType: isCheckedIn ? 'CHECK_IN' : 'CHECK_OUT',
    entityType: 'PERSON',
    entityId: personId,
    details: {
      parentName,
      newStatus: isCheckedIn ? 'checked-in' : 'checked-out'
    }
  });
}

/**
 * Log an event creation
 */
export async function logEventCreated(actorEmail, eventId, eventData) {
  return logAuditEvent({
    actorEmail,
    actionType: 'CREATE',
    entityType: 'EVENT',
    entityId: eventId,
    details: {
      title: eventData.title,
      date: eventData.date,
      time: eventData.time
    }
  });
}

/**
 * Log an event deletion
 */
export async function logEventDeleted(actorEmail, eventId, eventData) {
  return logAuditEvent({
    actorEmail,
    actionType: 'DELETE',
    entityType: 'EVENT',
    entityId: eventId,
    details: {
      title: eventData.title,
      date: eventData.date,
      reason: 'Event removed'
    }
  });
}

/**
 * Log a donation/giving entry
 */
export async function logGivingRecorded(actorEmail, givingId, givingData) {
  return logAuditEvent({
    actorEmail,
    actionType: 'CREATE',
    entityType: 'DONATION',
    entityId: givingId,
    details: {
      amount: givingData.amount,
      method: givingData.method,
      reason: 'Giving/donation recorded'
    }
  });
}
