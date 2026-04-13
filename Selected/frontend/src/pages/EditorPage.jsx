// ============================================
// PRESENTATION LAYER — Editor Page
// This is the CLIENT side of the Layered Architecture.
// Responsibility: Show UI and handle user interactions.
// All data comes from api.js — no direct DB or server calls.
// ============================================

import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { getDocument, getNotifications, removeUserFromDocument, saveDocument, updateUserRole } from '../api.js'

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

  // Optional message after returning from version restore
  const location = useLocation()

  // Store the loaded document.
  const [document, setDocument] = useState(null)

  // Store editable content in state.
  const [content, setContent] = useState('')

  // Track save state for user feedback.
  const [lastSavedText, setLastSavedText] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)

  // Notification count for the navbar badge.
  const [unreadCount, setUnreadCount] = useState(0)

  // Copy of collaborators we can update when roles change (owner UI)
  const [collaborators, setCollaborators] = useState([])

  // Brief “Saved” label next to a role dropdown after a successful PATCH
  const [roleSavedUserId, setRoleSavedUserId] = useState(null)

  // One-time banner when user lands here after restoring a revision
  const [restoreBanner, setRestoreBanner] = useState('')

  const loadDoc = async () => {
    // Fetch the latest version of the document.
    const doc = await getDocument(id)

    // Save the document object for UI rendering.
    setDocument(doc)

    // Put the content into the editor textarea.
    setContent(doc.content || '')

    // Normalize ACL rows: DB/README use user_id; older responses may only have id
    const raw = doc.collaborators || []
    setCollaborators(
      raw.map((c) => ({
        ...c,
        user_id: c.user_id != null ? c.user_id : c.id
      }))
    )
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

  useEffect(() => {
    // Version history sends a flash message through router state
    const msg = location.state && location.state.restoreMessage
    if (msg) {
      setRestoreBanner(String(msg))
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, location.pathname, navigate])

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
    // Pull latest text from server first
    const doc = await getDocument(id)
    setDocument(doc)
    setContent(doc.content || '')
    const raw = doc.collaborators || []
    setCollaborators(
      raw.map((c) => ({
        ...c,
        user_id: c.user_id != null ? c.user_id : c.id
      }))
    )

    // Same as Save: persist a revision snapshot when editors/owners refresh
    const canEdit = String(doc.your_role || '').toLowerCase() !== 'viewer'
    if (canEdit) {
      const result = await saveDocument(id, doc.content || '')
      const time = new Date(result.updatedAt).toLocaleTimeString()
      setLastSavedText(`Last saved: ${time}`)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2000)
    }
  }

  // Logged-in profile (used to see if we’re the owner for ACL controls)
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('cn_user') || 'null')
    } catch {
      return null
    }
  }, [])

  const isDocumentOwner = currentUser && document && Number(currentUser.id) === Number(document.owner_id)

  const changeUserRole = async (userId, newRole) => {
    // Only the document owner can change roles — server enforces too
    try {
      await updateUserRole(id, userId, newRole)
      setCollaborators((prev) => prev.map((c) => (Number(c.user_id) === Number(userId) ? { ...c, role: newRole } : c)))
      setRoleSavedUserId(userId)
      setTimeout(() => setRoleSavedUserId(null), 1000)
    } catch (err) {
      alert('Could not update role: ' + (err?.response?.data?.error || err.message))
    }
  }

  const removeUser = async (userId, username) => {
    // Confirm before removing someone’s access entirely
    if (!window.confirm(`Remove ${username}'s access to this document?`)) return
    try {
      await removeUserFromDocument(id, userId)
      setCollaborators((prev) => prev.filter((c) => Number(c.user_id) !== Number(userId)))
    } catch (err) {
      alert('Could not remove user: ' + (err?.response?.data?.error || err.message))
    }
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

        {/* After restore, show a short confirmation at the top of the editor */}
        {restoreBanner ? (
          <div style={{ marginTop: 10, color: '#10B981', fontWeight: 800, fontSize: 14 }}>{restoreBanner}</div>
        ) : null}

        {/* Access list — owners get role dropdown + remove; everyone else sees the simple list */}
        <div style={{ marginTop: 12, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Active collaborators</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, color: COLORS.muted, fontSize: 13 }}>
            {collaborators.map((c) => {
              const isMe = currentUser && Number(c.user_id) === Number(currentUser.id)
              const isOwnerRow = String(c.role || '').toLowerCase() === 'owner'
              const showManage = isDocumentOwner && !isMe && !isOwnerRow

              return (
                <div
                  key={c.user_id}
                  style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '6px 10px', border: `1px solid ${COLORS.border}`, borderRadius: 10 }}
                >
                  <span style={{ fontWeight: 800, color: COLORS.text }}>
                    {c.username} · {c.role}
                  </span>

                  {showManage ? (
                    <>
                      <select
                        value={String(c.role || '').toLowerCase() === 'editor' ? 'editor' : 'viewer'}
                        onChange={(e) => changeUserRole(c.user_id, e.target.value)}
                        style={{ height: 30, borderRadius: 8, border: `1px solid ${COLORS.border}`, padding: '0 8px', fontSize: 13 }}
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      {roleSavedUserId != null && Number(roleSavedUserId) === Number(c.user_id) ? (
                        <span style={{ fontSize: 12, color: '#10B981', fontWeight: 800 }}>Saved</span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeUser(c.user_id, c.username)}
                        style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 12, fontWeight: 800, padding: 0 }}
                      >
                        Remove user
                      </button>
                    </>
                  ) : null}
                </div>
              )
            })}
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

