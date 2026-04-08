/* File: src/components/LoadingSpinner.jsx
 * ARCHITECTURE (Layered): React UI -> api service -> monolith service chain.
 * ARCHITECTURE (Event-Driven): same UI contract; write calls trigger domain events.
 * Service communication: Context + API + WebSocket.
 * Events/Methods: REST methods in layered, event publication/consumption in EDA.
 */
export default function LoadingSpinner({size=24}){ return <div className='mx-auto animate-spin rounded-full border-4 border-primary/20 border-t-primary' style={{width:size,height:size}} /> }
