/**
 * EventBus — In-memory Publish-Subscribe event bus.
 *
 * Architectural style: Implicit Invocation / Publish-Subscribe
 * (Taylor, Medvidovic & Dashofy, Software Architecture, 2008)
 *
 * Properties:
 * - Publishers emit immutable events and have no knowledge of subscribers.
 * - Subscribers register/deregister by event type.
 * - Events are plain frozen objects — immutable after creation.
 */

class EventBus {
  constructor() {
    this._subscribers = {};
  }

  subscribe(eventType, handler) {
    if (!this._subscribers[eventType]) {
      this._subscribers[eventType] = [];
    }
    this._subscribers[eventType].push(handler);
    console.log(`[EventBus] Subscriber registered for "${eventType}"`);
  }

  publish(eventType, payload) {
    const event = Object.freeze({
      eventType,
      timestamp: new Date().toISOString(),
      ...payload,
    });

    console.log(`[EventBus] Event published: "${eventType}"`, event);

    const handlers = this._subscribers[eventType] || [];
    if (handlers.length === 0) {
      console.warn(`[EventBus] No subscribers for "${eventType}"`);
    }
    handlers.forEach((handler) => {
      try {
        handler(event);
      } catch (err) {
        console.error(`[EventBus] Handler error for "${eventType}":`, err);
      }
    });
  }

  unsubscribe(eventType, handler) {
    if (!this._subscribers[eventType]) return;
    this._subscribers[eventType] = this._subscribers[eventType].filter(
      (h) => h !== handler
    );
  }
}

const eventBus = new EventBus();
module.exports = eventBus;
