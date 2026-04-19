/**
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
