/* File: src/components/Navbar.jsx
 * ARCHITECTURE (Layered): React UI -> api service -> monolith service chain.
 * ARCHITECTURE (Event-Driven): same UI contract; write calls trigger domain events.
 * Service communication: Context + API + WebSocket.
 * Events/Methods: REST methods in layered, event publication/consumption in EDA.
 */

// ARCHITECTURE NOTE (Layered): Navbar receives user state from AuthService context; logout calls DELETE /api/auth/session.
// ARCHITECTURE NOTE (Event-Driven): logout publishes UserLoggedOut event consumed by auth/collab pipeline.
import { Link } from 'react-router-dom'
import { DocumentTextIcon } from '@heroicons/react/24/outline'
export default function Navbar({ currentPage, username, onLogout, notifCount=0 }) {
  const links=[{key:'dashboard',to:'/dashboard',label:'Dashboard'},{key:'documents',to:'/dashboard',label:'Documents'},{key:'notifications',to:'/notifications',label:'Notifications'}]
  return <header className='h-navbar border-b border-border bg-white'><div className='mx-auto flex h-full w-full max-w-app items-center justify-between px-4'><div className='flex items-center gap-2'><DocumentTextIcon className='h-5 w-5 text-primary'/><span className='text-lg font-bold'>CollabNotes</span></div><nav className='flex h-full items-center gap-6'>{links.map((l)=>{const a=currentPage===l.key;return <Link key={l.key} to={l.to} className={`relative inline-flex h-full items-center border-b-2 text-sm font-medium ${a?'border-primary text-primary':'border-transparent text-text-secondary hover:text-text-primary'}`}>{l.label}{l.key==='notifications'&&notifCount>0?<span className='ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] text-white'>{notifCount}</span>:null}</Link>})}</nav><div className='flex items-center gap-3'><span className='text-sm font-medium'>{username}</span><button className='h-[34px] rounded-button border border-border px-3 text-sm' onClick={onLogout}>Log Out</button></div></div></header>
}
