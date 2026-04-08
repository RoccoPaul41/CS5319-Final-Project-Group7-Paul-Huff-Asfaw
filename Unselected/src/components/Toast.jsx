/* File: src/components/Toast.jsx
 * ARCHITECTURE (Layered): React UI -> api service -> monolith service chain.
 * ARCHITECTURE (Event-Driven): same UI contract; write calls trigger domain events.
 * Service communication: Context + API + WebSocket.
 * Events/Methods: REST methods in layered, event publication/consumption in EDA.
 */
import { useToast } from '../contexts/ToastContext'
export default function Toast(){const {items}=useToast(); const b={success:'border-success',error:'border-danger',info:'border-primary'}; return <div className='fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2'>{items.map((t)=><div key={t.id} className={`rounded-card border-l-4 bg-white p-3 shadow ${b[t.type]||b.info}`}><p className='text-sm'>{t.message}</p></div>)}</div> }
