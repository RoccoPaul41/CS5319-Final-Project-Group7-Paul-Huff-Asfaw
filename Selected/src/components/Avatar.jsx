/* File: src/components/Avatar.jsx
 * ARCHITECTURE (Layered): React UI -> api service -> monolith service chain.
 * ARCHITECTURE (Event-Driven): same UI contract; write calls trigger domain events.
 * Service communication: Context + API + WebSocket.
 * Events/Methods: REST methods in layered, event publication/consumption in EDA.
 */
export default function Avatar({ name,size=28,color='blue' }){ const p={blue:['#DBEAFE','#1D4ED8'],green:['#D1FAE5','#065F46'],amber:['#FEF3C7','#92400E'],purple:['#EDE9FE','#5B21B6']}[color]||['#DBEAFE','#1D4ED8']; const i=(name||'?').split(' ').filter(Boolean).slice(0,2).map((x)=>x[0].toUpperCase()).join(''); return <div className='inline-flex items-center justify-center rounded-full font-medium' style={{width:size,height:size,background:p[0],color:p[1],fontSize:size*0.42}}>{i}</div> }
