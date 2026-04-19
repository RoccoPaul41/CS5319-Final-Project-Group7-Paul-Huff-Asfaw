/**
 * WebSocketGateway — Bridges EventBus to connected frontend clients.
 * Subscriber only. Never publishes events.
 */
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const eventBus = require('../eventBus/eventBus');
const { EVENT_TYPES } = require('../events/eventTypes');

class WebSocketGateway {
  constructor() {
    this._clients = new Map();
    this._wss = null;
  }

  attach(httpServer) {
    this._wss = new WebSocketServer({ server: httpServer });

    this._wss.on('connection', (ws, req) => {
      const token = new URL(req.url, 'ws://localhost').searchParams.get('token');
      let userId;
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = String(decoded.userId || decoded.id);
      } catch {
        ws.close(1008, 'Invalid token');
        return;
      }

      if (!this._clients.has(userId)) this._clients.set(userId, new Set());
      this._clients.get(userId).add(ws);
      console.log(`[WSGateway] User ${userId} connected`);

      ws.on('close', () => {
        this._clients.get(userId)?.delete(ws);
        console.log(`[WSGateway] User ${userId} disconnected`);
      });
    });

    this._registerSubscriptions();
    console.log('[WSGateway] Attached to HTTP server and subscribed to events');
  }

  _registerSubscriptions() {
    eventBus.subscribe(EVENT_TYPES.DOCUMENT_SAVED, (event) => {
      this._pushToDocument(event.documentId, { type: 'documentSaved', event });
    });
    eventBus.subscribe(EVENT_TYPES.DOCUMENT_SHARED, (event) => {
      this._pushToUser(event.sharedWithId, { type: 'documentShared', event });
    });
    eventBus.subscribe(EVENT_TYPES.DOCUMENT_DELETED, (event) => {
      (event.affectedUserIds || []).forEach((uid) =>
        this._pushToUser(uid, { type: 'documentDeleted', event }));
    });
    eventBus.subscribe(EVENT_TYPES.VERSION_RESTORED, (event) => {
      (event.affectedUserIds || []).forEach((uid) =>
        this._pushToUser(uid, { type: 'versionRestored', event }));
    });
    eventBus.subscribe(EVENT_TYPES.NOTIFICATION_GENERATED, (event) => {
      this._pushToUser(event.userId, { type: 'notification', event });
    });
  }

  async _pushToDocument(documentId, message) {
    const pool = require('../db/pool');
    try {
      const result = await pool.query(
        `SELECT user_id FROM acl WHERE document_id = $1`, [documentId]
      );
      result.rows.forEach(({ user_id }) => this._pushToUser(user_id, message));
    } catch (err) {
      console.error('[WSGateway] _pushToDocument error:', err);
    }
  }

  _pushToUser(userId, message) {
    const sockets = this._clients.get(String(userId));
    if (!sockets || sockets.size === 0) return;
    const payload = JSON.stringify(message);
    sockets.forEach((ws) => {
      if (ws.readyState === 1) ws.send(payload);
    });
  }
}

module.exports = new WebSocketGateway();
