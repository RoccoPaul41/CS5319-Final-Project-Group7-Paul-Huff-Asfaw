/**
 * EVENT DEFINITIONS — these are the contracts between services
 * each event has a name and a payload of data it carries
 * producers publish these, consumers listen for them
 * events are immutable once published
 *
 * eventTypes.js — Canonical event type constants and factory functions.
 *
 * Architecture note: Events are the sole communication channel between
 * services (Implicit Invocation). Each event is immutable and self-contained.
 * No service calls another service directly — all coordination is through events.
 */

const EVENT_TYPES = Object.freeze({
  USER_REGISTERED:         'userRegistered',
  USER_LOGGED_IN:          'userLoggedIn',
  DOCUMENT_CREATED:        'documentCreated',
  DOCUMENT_EDITED:         'documentEdited',
  DOCUMENT_SAVED:          'documentSaved',
  DOCUMENT_SHARED:         'documentShared',
  DOCUMENT_DELETED:        'documentDeleted',
  DOCUMENT_ROLE_UPDATED:   'documentRoleUpdated',
  DOCUMENT_ACCESS_REVOKED: 'documentAccessRevoked',
  VERSION_RESTORED:        'versionRestored',
  COLLABORATOR_JOINED:     'collaboratorJoined',
  COLLABORATOR_LEFT:       'collaboratorLeft',
  NOTIFICATION_GENERATED:  'notificationGenerated',
});

const Events = {
  userRegistered: ({ userId, username, email }) =>
    ({ userId, username, email }),

  userLoggedIn: ({ userId, username }) =>
    ({ userId, username }),

  documentCreated: ({ documentId, title, ownerId, ownerUsername }) =>
    ({ documentId, title, ownerId, ownerUsername }),

  documentEdited: ({ documentId, editorId, editorUsername, preview }) =>
    ({ documentId, editorId, editorUsername, preview }),

  documentSaved: ({ documentId, title, content, savedById, savedByUsername, versionNumber }) =>
    ({ documentId, title, content, savedById, savedByUsername, versionNumber }),

  documentShared: ({ documentId, title, ownerId, ownerUsername, sharedWithId, sharedWithUsername, role }) =>
    ({ documentId, title, ownerId, ownerUsername, sharedWithId, sharedWithUsername, role }),

  documentDeleted: ({ documentId, title, deletedById, affectedUserIds }) =>
    ({ documentId, title, deletedById, affectedUserIds }),

  documentRoleUpdated: ({ documentId, title, targetUserId, newRole, updatedById }) =>
    ({ documentId, title, targetUserId, newRole, updatedById }),

  documentAccessRevoked: ({ documentId, title, revokedUserId, revokedById }) =>
    ({ documentId, title, revokedUserId, revokedById }),

  versionRestored: ({ documentId, title, restoredById, restoredByUsername, versionNumber, affectedUserIds }) =>
    ({ documentId, title, restoredById, restoredByUsername, versionNumber, affectedUserIds }),

  notificationGenerated: ({ userId, type, documentId, actorId, message }) =>
    ({ userId, type, documentId, actorId, message }),
};

module.exports = { EVENT_TYPES, Events };
