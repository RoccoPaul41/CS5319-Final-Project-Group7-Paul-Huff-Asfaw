/**
 * SERVICE: VersioningService
 * PUBLISHES: (none)
 * CONSUMES: documentSaved
 * in event-driven arch services only know about events,
 * not about other services directly
 *
 * VersioningService — Event consumer for persisting document content from DOCUMENT_SAVED.
 * Subscriber only. Never calls other services directly.
 */
const pool = require('../db/pool')
const eventBus = require('../eventBus/eventBus')
const { EVENT_TYPES } = require('../events/eventTypes')

class VersioningService {
  register() {
    eventBus.subscribe(EVENT_TYPES.DOCUMENT_SAVED, this._onDocumentSaved.bind(this))
    console.log('[VersioningService] Registered as subscriber')
  }

  async _onDocumentSaved(event) {
    try {
      await pool.query(`UPDATE documents SET content = $1, updated_at = NOW() WHERE id = $2`, [
        event.content,
        event.documentId,
      ])
      console.log(`[VersioningService] Document ${event.documentId} content updated`)
    } catch (err) {
      console.error('[VersioningService] _onDocumentSaved error:', err)
    }
  }
}

module.exports = new VersioningService()
