/**
 * EVENT BUS — this is the core of the event-driven architecture
 * services publish events here instead of calling each other
 * this decouples the services so they can work independently
 * equivalent role to api.js connector in the layered architecture
 * but instead of HTTP calls it routes internal events
 *
 * EventTracer — Subscribes to all events and logs a formatted trace.
 * Demo/debug tool only. No business logic.
 */
const eventBus = require('./eventBus')
const { EVENT_TYPES } = require('../events/eventTypes')

function registerTracer() {
  Object.values(EVENT_TYPES).forEach((eventType) => {
    eventBus.subscribe(eventType, (event) => {
      console.log('\n╔══════════════════════════════════════════════════════')
      console.log(`║ EVENT TRACE: ${event.eventType}`)
      console.log(`║ Timestamp:   ${event.timestamp}`)
      console.log('║ Payload:', JSON.stringify(event, null, 2).replace(/\n/g, '\n║ '))
      console.log('╚══════════════════════════════════════════════════════\n')
    })
  })
  console.log('[EventTracer] Tracing all events for demo')
}

module.exports = { registerTracer }
