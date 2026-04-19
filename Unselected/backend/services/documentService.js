/**
 * SERVICE: DocumentService
 * PUBLISHES: (none)
 * CONSUMES: documentCreated, documentShared, documentDeleted, documentRoleUpdated, documentAccessRevoked
 * in event-driven arch services only know about events,
 * not about other services directly
 *
 * DocumentService — Event consumer for document lifecycle (acknowledgments).
 * Subscriber only. Never calls other services directly.
 */
const eventBus = require('../eventBus/eventBus')
const { EVENT_TYPES } = require('../events/eventTypes')

class DocumentService {
  register() {
    eventBus.subscribe(EVENT_TYPES.DOCUMENT_CREATED, this._onDocumentCreated.bind(this))
    eventBus.subscribe(EVENT_TYPES.DOCUMENT_SHARED, this._onDocumentShared.bind(this))
    eventBus.subscribe(EVENT_TYPES.DOCUMENT_DELETED, this._onDocumentDeleted.bind(this))
    eventBus.subscribe(EVENT_TYPES.DOCUMENT_ROLE_UPDATED, this._onRoleUpdated.bind(this))
    eventBus.subscribe(EVENT_TYPES.DOCUMENT_ACCESS_REVOKED, this._onAccessRevoked.bind(this))
    console.log('[DocumentService] Registered as subscriber')
  }

  async _onDocumentCreated(event) {
    console.log(`[DocumentService] Acknowledged documentCreated for doc ${event.documentId}`)
  }

  async _onDocumentShared(event) {
    console.log(
      `[DocumentService] Acknowledged documentShared: doc ${event.documentId} → user ${event.sharedWithId}`
    )
  }

  async _onDocumentDeleted(event) {
    console.log(`[DocumentService] Acknowledged documentDeleted: doc ${event.documentId}`)
  }

  async _onRoleUpdated(event) {
    console.log(
      `[DocumentService] Acknowledged roleUpdated: doc ${event.documentId}, user ${event.targetUserId} → ${event.newRole}`
    )
  }

  async _onAccessRevoked(event) {
    console.log(
      `[DocumentService] Acknowledged accessRevoked: doc ${event.documentId}, user ${event.revokedUserId}`
    )
  }
}

module.exports = new DocumentService()
