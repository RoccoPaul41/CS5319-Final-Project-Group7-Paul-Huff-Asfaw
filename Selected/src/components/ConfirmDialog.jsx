/* File: src/components/ConfirmDialog.jsx
 * ARCHITECTURE (Layered): React UI -> api service -> monolith service chain.
 * ARCHITECTURE (Event-Driven): same UI contract; write calls trigger domain events.
 * Service communication: Context + API + WebSocket.
 * Events/Methods: REST methods in layered, event publication/consumption in EDA.
 */
export default function ConfirmDialog({isOpen,title,message,confirmLabel='Confirm',onConfirm,onCancel,danger=false}){ if(!isOpen) return null; return <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'><div className='w-full max-w-sm rounded-modal bg-white p-6'><h3 className='text-lg font-semibold'>{title}</h3><p className='mt-2 text-sm text-text-secondary'>{message}</p><div className='mt-5 flex justify-end gap-2'><button className='h-9 rounded-button border border-border px-4' onClick={onCancel}>Cancel</button><button className={`h-9 rounded-button px-4 text-white ${danger?'bg-danger':'bg-primary'}`} onClick={onConfirm}>{confirmLabel}</button></div></div></div> }
