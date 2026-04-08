/* File: src/components/Badge.jsx
 * ARCHITECTURE (Layered): React UI -> api service -> monolith service chain.
 * ARCHITECTURE (Event-Driven): same UI contract; write calls trigger domain events.
 * Service communication: Context + API + WebSocket.
 * Events/Methods: REST methods in layered, event publication/consumption in EDA.
 */
const s={owner:'bg-owner-bg text-owner-text',shared:'bg-shared-bg text-shared-text',editor:'bg-editor-bg text-editor-text',viewer:'bg-gray-100 text-gray-600'}
export default function Badge({type}){return <span className={`inline-flex h-[22px] items-center rounded-full px-2.5 text-xs font-medium ${s[type]||s.viewer}`}>{type?.[0]?.toUpperCase()+type?.slice(1)}</span>}
