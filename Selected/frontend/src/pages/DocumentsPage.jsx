// ============================================
// PRESENTATION LAYER — Documents Page
// Simple list view of all accessible documents.
// Different from Dashboard which has sidebar filters.
// Calls getDocuments() from api.js on mount.
// ============================================

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { getDocuments, getNotifications } from '../api.js'

const COLORS = {
  primary: '#4F46E5',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  muted: '#6B7280'
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([])
  const [notifications, setNotifications] = useState([])
  // Search box text — filters the list we already loaded (no extra API)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const load = async () => {
    // Load documents and notifications so the navbar badge is accurate.
    const [docs, notifs] = await Promise.all([getDocuments(), getNotifications()])
    setDocuments(docs)
    setNotifications(notifs)
  }

  useEffect(() => {
    // Load the page data once when the page opens.
    load().catch((e) => console.error(e))
  }, [])

  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications])

  // Filter by title as the user types (client-side only)
  const filtered = documents.filter((doc) =>
    String(doc.title || '')
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const formatRole = (role) => {
    // Display nice casing while keeping backend enums lowercase.
    const r = String(role || '').toLowerCase()
    if (r === 'owner') return 'Owner'
    if (r === 'editor') return 'Editor'
    return 'Viewer'
  }

  return (
    <div style={{ background: COLORS.background, minHeight: '100vh' }}>
      <Navbar unreadCount={unreadCount} />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: COLORS.text }}>Documents</div>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ height: 34, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: 'transparent', cursor: 'pointer', fontWeight: 900 }}
          >
            + New
          </button>
        </div>

        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: 'hidden' }}>
          {/* Search documents — same border/focus colors as the rest of the app */}
          <div style={{ padding: 12, borderBottom: `1px solid ${COLORS.border}` }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents..."
              style={{
                width: '100%',
                maxWidth: 420,
                height: 40,
                borderRadius: 8,
                border: `1px solid ${COLORS.border}`,
                background: COLORS.background,
                padding: '0 12px',
                fontSize: 14,
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = COLORS.primary
              }}
              onBlur={(e) => {
                e.target.style.borderColor = COLORS.border
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 0.7fr 1fr 120px', gap: 0, padding: 12, borderBottom: `1px solid ${COLORS.border}`, fontWeight: 900, color: COLORS.muted, fontSize: 12 }}>
            <div>Title</div>
            <div>Owner</div>
            <div>Your role</div>
            <div>Last updated</div>
            <div></div>
          </div>

          {filtered.map((doc) => (
            <div key={doc.id} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 0.7fr 1fr 120px', padding: 12, borderBottom: `1px solid ${COLORS.border}`, alignItems: 'center', background: 'white' }}>
              <button
                onClick={() => navigate(`/documents/${doc.id}`)}
                style={{ textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 900, color: COLORS.text }}
              >
                {doc.title}
              </button>
              <div style={{ color: COLORS.muted, fontSize: 13 }}>{doc.owner_username}</div>
              <div style={{ color: COLORS.primary, fontWeight: 900, fontSize: 13 }}>{formatRole(doc.your_role)}</div>
              <div style={{ color: COLORS.muted, fontSize: 13 }}>{new Date(doc.updated_at).toLocaleString()}</div>
              <button
                onClick={() => navigate(`/documents/${doc.id}`)}
                style={{ height: 30, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: 'transparent', cursor: 'pointer', fontWeight: 900 }}
              >
                Open
              </button>
            </div>
          ))}

          {documents.length === 0 ? (
            <div style={{ padding: 16, color: COLORS.muted }}>No documents yet.</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 16, color: COLORS.muted }}>No documents match your search</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

