// ============================================
// PRESENTATION LAYER — Dashboard Page
// This is the CLIENT side of the Layered Architecture.
// Responsibility: Show UI and handle user interactions.
// All data comes from api.js — no direct DB or server calls.
// ============================================

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { createDocument, deleteDocument, getDocuments, getNotifications, searchUsers, shareDocument } from '../api.js'

const COLORS = {
  primary: '#4F46E5',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  muted: '#6B7280',
  danger: '#EF4444'
}

function timeAgo(iso) {
  // Convert a timestamp into “X min ago” style text.
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (Number.isNaN(minutes)) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hr ago`
  return 'Yesterday'
}

export default function DashboardPage() {
  // Read the current user once from localStorage.
  const currentUser = JSON.parse(localStorage.getItem('cn_user') || 'null')

  // Store documents and notifications.
  const [documents, setDocuments] = useState([])
  const [notifications, setNotifications] = useState([])

  // Sidebar filter.
  const [filter, setFilter] = useState('all') // all | mine | shared

  // New document inline form.
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [createError, setCreateError] = useState('')

  // Share form state.
  const [shareOpenForDocId, setShareOpenForDocId] = useState(null)
  const [shareQuery, setShareQuery] = useState('')
  const [shareResults, setShareResults] = useState([])
  const [shareRole, setShareRole] = useState('viewer')
  const [shareError, setShareError] = useState('')
  // Picked from search — API runs only after Confirm share
  const [shareSelectedUser, setShareSelectedUser] = useState(null)

  const navigate = useNavigate()

  const loadPageData = async () => {
    // Load documents and notifications in parallel.
    const [docs, notifs] = await Promise.all([getDocuments(), getNotifications()])
    setDocuments(docs)
    setNotifications(notifs)
  }

  useEffect(() => {
    // Load the dashboard once when the page opens.
    loadPageData().catch((err) => console.error(err))
  }, [])

  // Compute unread badge count.
  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications])

  // Apply the requested filters.
  const filteredDocs = useMemo(() => {
    if (filter === 'mine') return documents.filter((d) => Number(d.owner_id) === Number(currentUser?.id))
    if (filter === 'shared') return documents.filter((d) => Number(d.owner_id) !== Number(currentUser?.id))
    return documents
  }, [documents, filter, currentUser])

  const handleCreateDocument = async () => {
    // Clear prior errors.
    setCreateError('')

    // Validate title.
    if (!newTitle.trim()) {
      setCreateError('Title is required')
      return
    }

    try {
      // Create the document via the API layer.
      // Documents always start as private.
      // Share them from inside the editor once created.
      await createDocument(newTitle.trim(), 'private')

      // Reset form.
      setNewTitle('')
      setShowCreate(false)

      // Refresh list.
      await loadPageData()
    } catch (err) {
      const d = err?.response?.data
      const msg = [d?.error, d?.detail].filter(Boolean).join(' — ')
      setCreateError(msg || 'Could not create document')
    }
  }

  const handleDeleteDocument = async (doc) => {
    // Confirm deletion with the simplest built-in prompt.
    const ok = window.confirm(`Delete "${doc.title}"?`)
    if (!ok) return

    try {
      // Delete via API layer.
      await deleteDocument(doc.id)

      // Refresh list.
      await loadPageData()
    } catch (err) {
      window.alert(err?.response?.data?.error || 'Could not delete document')
    }
  }

  const openShareForm = (docId) => {
    // Open share UI for the selected document.
    setShareOpenForDocId(docId)
    setShareQuery('')
    setShareResults([])
    setShareRole('viewer')
    setShareError('')
    setShareSelectedUser(null)
  }

  const handleSearchUsers = async (query) => {
    // Keep query in sync with the input.
    setShareQuery(query)
    setShareSelectedUser(null)

    // Empty query means no dropdown.
    if (!query.trim()) {
      setShareResults([])
      return
    }

    try {
      // Call API search endpoint.
      const results = await searchUsers(query.trim())
      setShareResults(results)
    } catch {
      // If search fails, just clear results.
      setShareResults([])
    }
  }

  const handleShareDocument = async (docId, targetUsername) => {
    // Clear prior errors.
    setShareError('')

    try {
      // Share via API layer.
      await shareDocument(docId, targetUsername, shareRole)

      // Close the share UI.
      setShareOpenForDocId(null)
      setShareSelectedUser(null)

      // Refresh list and mini notifications.
      await loadPageData()
    } catch (err) {
      setShareError(err?.response?.data?.error || 'Could not share document')
    }
  }

  return (
    <div style={{ background: COLORS.background, minHeight: '100vh' }}>
      <Navbar unreadCount={unreadCount} />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 16 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          {/* Sidebar */}
          <div style={{ width: 240, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 16, height: 'fit-content' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: COLORS.muted, letterSpacing: 0.6 }}>FILTER</div>

            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { key: 'all', label: 'All Documents' },
                { key: 'mine', label: 'My Documents' },
                { key: 'shared', label: 'Shared With Me' }
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setFilter(item.key)}
                  style={{
                    height: 34,
                    borderRadius: 999,
                    border: `1px solid ${COLORS.border}`,
                    background: filter === item.key ? COLORS.primary : 'transparent',
                    color: filter === item.key ? 'white' : COLORS.text,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: '0 12px'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Mini notifications panel */}
            <div style={{ marginTop: 18, padding: 12, borderRadius: 10, background: '#FEF3C7', borderLeft: '4px solid #F59E0B' }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: COLORS.text }}>Notifications ({unreadCount})</div>
              <ul style={{ margin: '8px 0 0 18px', padding: 0, color: COLORS.muted, fontSize: 13 }}>
                {notifications.slice(0, 3).map((n) => (
                  <li key={n.id} style={{ marginBottom: 6 }}>
                    {n.message}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/notifications')}
                style={{ marginTop: 6, background: 'transparent', border: 'none', padding: 0, color: COLORS.primary, fontWeight: 800, cursor: 'pointer' }}
              >
                View all →
              </button>
            </div>
          </div>

          {/* Main content */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900, color: COLORS.text }}>My Documents</div>
                <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>
                  {filteredDocs.length} documents · last updated {filteredDocs[0]?.updated_at ? timeAgo(filteredDocs[0].updated_at) : 'n/a'}
                </div>
              </div>

              <button
                onClick={() => {
                  setShowCreate(true)
                  setCreateError('')
                }}
                style={{ height: 38, borderRadius: 10, border: 'none', background: COLORS.primary, color: 'white', fontWeight: 900, padding: '0 14px', cursor: 'pointer' }}
              >
                + New Document
              </button>
            </div>

            {/* Create inline form */}
            {showCreate ? (
              <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
                <div style={{ fontWeight: 900, marginBottom: 10 }}>Create New Document</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Enter a title..."
                    style={{ height: 38, borderRadius: 8, border: `1px solid ${COLORS.border}`, padding: '0 10px' }}
                  />
                </div>

                {createError ? <div style={{ marginTop: 8, color: COLORS.danger, fontSize: 13 }}>{createError}</div> : null}

                <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowCreate(false)}
                    style={{ height: 34, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: 'transparent', cursor: 'pointer', fontWeight: 800 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateDocument}
                    style={{ height: 34, borderRadius: 8, border: 'none', background: COLORS.primary, color: 'white', cursor: 'pointer', fontWeight: 900 }}
                  >
                    Create
                  </button>
                </div>
              </div>
            ) : null}

            {/* Document grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {filteredDocs.map((doc) => {
                const role = String(doc.your_role || '').toLowerCase()
                const isOwner = role === 'owner'
                const roleLabel = role === 'owner' ? 'Owner' : role === 'editor' ? 'Editor' : 'Viewer'

                return (
                  <div key={doc.id} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 12 }}>
                    <div style={{ fontWeight: 900, fontSize: 16, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.title}</div>
                    <div style={{ marginTop: 6, fontSize: 13, color: COLORS.muted }}>Owner: {doc.owner_username}</div>
                    <div style={{ marginTop: 6, fontSize: 12, color: COLORS.muted }}>Modified {timeAgo(doc.updated_at)}</div>

                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 900, color: COLORS.primary }}>{roleLabel}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => navigate(`/documents/${doc.id}`)}
                          style={{ height: 28, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: 'transparent', cursor: 'pointer', fontWeight: 800, fontSize: 12 }}
                        >
                          Open
                        </button>
                        {isOwner ? (
                          <button
                            onClick={() => handleDeleteDocument(doc)}
                            style={{ height: 28, borderRadius: 8, border: `1px solid ${COLORS.danger}`, background: 'transparent', cursor: 'pointer', fontWeight: 900, fontSize: 12, color: COLORS.danger }}
                          >
                            Del
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* Share UI (owners only) */}
                    {isOwner ? (
                      <div style={{ marginTop: 10 }}>
                        {shareOpenForDocId === doc.id ? (
                          <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 10 }}>
                            <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 6 }}>Share</div>
                            <input
                              value={shareQuery}
                              onChange={(e) => handleSearchUsers(e.target.value)}
                              placeholder="Search username..."
                              style={{ height: 34, borderRadius: 8, border: `1px solid ${COLORS.border}`, padding: '0 10px', width: '100%' }}
                            />

                            {shareResults.length > 0 ? (
                              <div style={{ marginTop: 6, border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: 'hidden' }}>
                                {shareResults.map((u) => {
                                  const picked = shareSelectedUser && Number(shareSelectedUser.id) === Number(u.id)
                                  return (
                                    <button
                                      key={u.id}
                                      type="button"
                                      onClick={() => setShareSelectedUser({ id: u.id, username: u.username })}
                                      style={{
                                        width: '100%',
                                        textAlign: 'left',
                                        padding: '8px 10px',
                                        border: 'none',
                                        background: picked ? '#EEF2FF' : 'white',
                                        cursor: 'pointer',
                                        borderBottom: `1px solid ${COLORS.border}`,
                                        fontWeight: picked ? 900 : 400
                                      }}
                                    >
                                      {u.username}
                                    </button>
                                  )
                                })}
                              </div>
                            ) : null}

                            {shareSelectedUser ? (
                              <div style={{ marginTop: 8, fontSize: 13, color: COLORS.text }}>
                                Selected: <strong>{shareSelectedUser.username}</strong> — pick a role, then confirm.
                              </div>
                            ) : null}

                            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <select
                                value={shareRole}
                                onChange={(e) => setShareRole(e.target.value)}
                                style={{ height: 34, borderRadius: 8, border: `1px solid ${COLORS.border}`, padding: '0 10px', flex: 1, minWidth: 120 }}
                              >
                                <option value="editor">Editor</option>
                                <option value="viewer">Viewer</option>
                              </select>

                              <button
                                type="button"
                                disabled={!shareSelectedUser}
                                onClick={() => shareSelectedUser && handleShareDocument(doc.id, shareSelectedUser.username)}
                                style={{
                                  height: 34,
                                  borderRadius: 8,
                                  border: 'none',
                                  background: shareSelectedUser ? COLORS.primary : COLORS.border,
                                  color: 'white',
                                  cursor: shareSelectedUser ? 'pointer' : 'not-allowed',
                                  fontWeight: 900,
                                  padding: '0 12px',
                                  opacity: shareSelectedUser ? 1 : 0.7
                                }}
                              >
                                Confirm share
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setShareOpenForDocId(null)
                                  setShareError('')
                                  setShareSelectedUser(null)
                                }}
                                style={{ height: 34, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: 'transparent', cursor: 'pointer', fontWeight: 800 }}
                              >
                                Close
                              </button>
                            </div>

                            {shareError ? <div style={{ marginTop: 8, color: COLORS.danger, fontSize: 13 }}>{shareError}</div> : null}
                          </div>
                        ) : (
                          <button
                            onClick={() => openShareForm(doc.id)}
                            style={{ marginTop: 8, height: 28, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: 'transparent', cursor: 'pointer', fontWeight: 800, fontSize: 12 }}
                          >
                            Share
                          </button>
                        )}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

