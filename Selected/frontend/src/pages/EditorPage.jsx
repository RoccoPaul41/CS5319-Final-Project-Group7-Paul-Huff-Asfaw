// ============================================
// PRESENTATION LAYER — Editor Page
// This is the CLIENT side of the Layered Architecture.
// Responsibility: Show UI and handle user interactions.
// All data comes from api.js — no direct DB or server calls.
// ============================================

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { getDocument, getNotifications, saveDocument } from '../api.js'

const COLORS = {
  primary: '#4F46E5',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  muted: '#6B7280'
}

export default function EditorPage() {
  // Read the document id from the URL.
  const { id } = useParams()

  // Router helper for navigation.
  const navigate = useNavigate()

  // Store the loaded document.
  const [document, setDocument] = useState(null)

  // Store editable content in state.
  const [content, setContent] = useState('')

  // Track save state for user feedback.
  const [lastSavedText, setLastSavedText] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)

  // Notification count for the navbar badge.
  const [unreadCount, setUnreadCount] = useState(0)

  const loadDoc = async () => {
    // Fetch the latest version of the document.
    const doc = await getDocument(id)

    // Save the document object for UI rendering.
    setDocument(doc)

    // Put the content into the editor textarea.
    setContent(doc.content || '')
  }

  const loadUnread = async () => {
    // Fetch notifications so we can show an unread badge in the navbar.
    const notifs = await getNotifications()
    setUnreadCount(notifs.filter((n) => !n.is_read).length)
  }

  useEffect(() => {
    // Load the document and notification badge when this page opens.
    loadDoc().catch((e) => console.error(e))
    loadUnread().catch((e) => console.error(e))
  }, [id])

  // This determines whether the user can edit.
  const isViewer = useMemo(() => String(document?.your_role || '').toLowerCase() === 'viewer', [document])

  const handleSave = async () => {
    // Send the content to the API layer to be saved.
    const result = await saveDocument(id, content)

    // Convert the updated timestamp into a human-friendly label.
    const time = new Date(result.updatedAt).toLocaleTimeString()
    setLastSavedText(`Last saved: ${time}`)

    // Show a brief "Saved!" success message.
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2000)
  }

  const handleRefresh = async () => {
    // Refresh is how two users can see each other’s edits.
    // One user saves; the other clicks Refresh to pull the latest content.
    await loadDoc()
  }

  // If the document hasn’t loaded yet, show a simple loading state.
  if (!document) {
    return (
      <div style={{ background: COLORS.background, minHeight: '100vh' }}>
        <Navbar unreadCount={unreadCount} />
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: 16, color: COLORS.muted }}>Loading document...</div>
      </div>
    )
  }

  return (
    <div style={{ background: COLORS.background, minHeight: '100vh' }}>
      <Navbar unreadCount={unreadCount} />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 16 }}>
        {/* Header bar */}
        <div
          style={{
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: COLORS.text }}>{document.title}</div>
            <div style={{ marginTop: 4, fontSize: 12, color: COLORS.muted }}>{lastSavedText || 'Last saved: not yet'}</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link to="/dashboard" style={{ color: COLORS.primary, fontWeight: 900, textDecoration: 'none' }}>
              Back to Dashboard
            </Link>

            <button
              onClick={() => navigate(`/documents/${id}/history`)}
              style={{ height: 34, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: 'transparent', cursor: 'pointer', fontWeight: 900 }}
            >
              View History
            </button>

            <button
              onClick={handleRefresh}
              style={{ height: 34, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: 'transparent', cursor: 'pointer', fontWeight: 900 }}
            >
              Refresh
            </button>

            {/* Hide Save button for viewers to match role enforcement rule. */}
            {!isViewer ? (
              <button
                onClick={handleSave}
                style={{
                  height: 34,
                  borderRadius: 8,
                  border: 'none',
                  background: COLORS.primary,
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 900,
                  padding: '0 12px'
                }}
              >
                Save
              </button>
            ) : null}
          </div>
        </div>

        {/* “Saved!” flash */}
        {savedFlash ? <div style={{ marginTop: 10, color: '#10B981', fontWeight: 900 }}>Saved!</div> : null}

        {/* Access list (collaborators) */}
        <div style={{ marginTop: 12, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Collaborators (access list)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, color: COLORS.muted, fontSize: 13 }}>
            {(document.collaborators || []).map((c) => (
              <div key={c.id} style={{ padding: '6px 10px', border: `1px solid ${COLORS.border}`, borderRadius: 999 }}>
                {c.username} · {c.role}
              </div>
            ))}
          </div>
        </div>

        {/* Editor area */}
        <div style={{ marginTop: 12, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Document Content</div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isViewer}
            style={{
              width: '100%',
              minHeight: 380,
              borderRadius: 10,
              border: `1px solid ${COLORS.border}`,
              padding: 12,
              fontSize: 14,
              resize: 'vertical',
              opacity: isViewer ? 0.7 : 1
            }}
          />
          {isViewer ? <div style={{ marginTop: 8, fontSize: 13, color: COLORS.muted }}>You are a viewer. Editing is disabled.</div> : null}
        </div>
      </div>
    </div>
  )
}

