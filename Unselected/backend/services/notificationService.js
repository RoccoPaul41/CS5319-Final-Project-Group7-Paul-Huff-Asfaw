/**
 * NotificationService — Event consumer for generating notifications.
 * Subscriber only. Never calls other services directly.
 */
const pool = require('../db/pool');
const eventBus = require('../eventBus/eventBus');
const { EVENT_TYPES } = require('../events/eventTypes');

class NotificationService {
  register() {
    eventBus.subscribe(EVENT_TYPES.DOCUMENT_SAVED, this._onDocumentSaved.bind(this));
    eventBus.subscribe(EVENT_TYPES.DOCUMENT_SHARED, this._onDocumentShared.bind(this));
    eventBus.subscribe(EVENT_TYPES.DOCUMENT_DELETED, this._onDocumentDeleted.bind(this));
    eventBus.subscribe(EVENT_TYPES.VERSION_RESTORED, this._onVersionRestored.bind(this));
    eventBus.subscribe(EVENT_TYPES.DOCUMENT_ROLE_UPDATED, this._onRoleUpdated.bind(this));
    eventBus.subscribe(EVENT_TYPES.DOCUMENT_ACCESS_REVOKED, this._onAccessRevoked.bind(this));
    console.log('[NotificationService] Registered as subscriber');
  }

  async _onDocumentSaved(event) {
    try {
      const result = await pool.query(
        `SELECT user_id FROM acl WHERE document_id = $1 AND user_id != $2`,
        [event.documentId, event.savedById]
      );
      for (const row of result.rows) {
        await this._insert(row.user_id, 'edit', event.documentId, event.savedById,
          `${event.savedByUsername} edited "${event.title}"`);
      }
    } catch (err) {
      console.error('[NotificationService] _onDocumentSaved error:', err);
    }
  }

  async _onDocumentShared(event) {
    try {
      await this._insert(event.sharedWithId, 'share', event.documentId, event.ownerId,
        `${event.ownerUsername} shared "${event.title}" with you as ${event.role}`);
    } catch (err) {
      console.error('[NotificationService] _onDocumentShared error:', err);
    }
  }

  async _onDocumentDeleted(event) {
    try {
      for (const userId of (event.affectedUserIds || [])) {
        if (userId === event.deletedById) continue;
        await this._insert(userId, 'delete', event.documentId, event.deletedById,
          `A document you had access to ("${event.title}") was deleted`);
      }
    } catch (err) {
      console.error('[NotificationService] _onDocumentDeleted error:', err);
    }
  }

  async _onVersionRestored(event) {
    try {
      for (const userId of (event.affectedUserIds || [])) {
        if (userId === event.restoredById) continue;
        await this._insert(userId, 'restore', event.documentId, event.restoredById,
          `${event.restoredByUsername} restored version ${event.versionNumber} of "${event.title}"`);
      }
    } catch (err) {
      console.error('[NotificationService] _onVersionRestored error:', err);
    }
  }

  async _onRoleUpdated(event) {
    try {
      await this._insert(event.targetUserId, 'role_change', event.documentId, event.updatedById,
        `Your role on "${event.title}" was changed to ${event.newRole}`);
    } catch (err) {
      console.error('[NotificationService] _onRoleUpdated error:', err);
    }
  }

  async _onAccessRevoked(event) {
    try {
      await this._insert(event.revokedUserId, 'access_revoked', event.documentId, event.revokedById,
        `Your access to "${event.title}" was removed`);
    } catch (err) {
      console.error('[NotificationService] _onAccessRevoked error:', err);
    }
  }

  async _insert(userId, type, documentId, actorId, message) {
    await pool.query(
      `INSERT INTO notifications (user_id, type, document_id, actor_id, message, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, false, NOW())`,
      [userId, type, documentId, actorId, message]
    );
    console.log(`[NotificationService] Notification created for user ${userId}: ${message}`);
  }
}

module.exports = new NotificationService();
