// ARCHITECTURE: Event-Driven
import * as layered from './api.layered.js'
// createDocument: triggers DocumentCreated event for versioning + notification services.
// saveDocument: triggers DocumentSaved event for collab/versioning/notification services.
// shareDocument: triggers DocumentShared event consumed by notification service.
// restoreRevision: triggers VersionRestored event consumed by doc/notification services.
export const {
  login, register, logout, getDocuments, createDocument, getDocument, saveDocument, deleteDocument,
  shareDocument, searchUsers, getRevisions, restoreRevision, getNotifications, markAllRead
} = layered
