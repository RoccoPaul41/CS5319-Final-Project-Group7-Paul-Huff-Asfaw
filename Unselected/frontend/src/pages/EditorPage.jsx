// # presentation layer - document editor
// # saves go to the api layer which updates postgres
// # and creates a revision entry automatically
// # the refresh button pulls the latest version down
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

export default function EditorPage() 
{
  const { id } = useParams()
  const navigate= useNavigate()
  const location = useLocation()
  const [doc, setDoc] = useState(null)
  const [content, setContent]= useState('')
  const [lastSavedText, setLastSavedText] = useState('')
  const [savedFlash, setSavedFlash] =useState(false)
  const [unreadCount, setUnreadCount] =useState(0)
  const [collaborators, setCollaborators] = useState([])
  const [roleSavedUserId, setRoleSavedUserId]= useState(null)
  const [restoreBanner, setRestoreBanner] =useState('')

  const loadDoc =async () => {
    const d = await getDocument(id)
    setDoc(d)
    setContent(d.content || '')

    const raw = d.collaborators || []
    setCollaborators(
      raw.map((c) => ({
        ...c,
        user_id: c.user_id != null ? c.user_id : c.id
      }))
    )
  }

  const loadUnread = async () => 
    {
    const notifs= await getNotifications()
    setUnreadCount(notifs.filter((n) => !n.is_read).length)
  }

  useEffect(() => {
    loadDoc().catch((e) => console.error(e))
    loadUnread().catch((e) => console.error(e))
  }, [id])

  useEffect(() => {
    const msg = location.state && location.state.restoreMessage
    if (msg) {
      setRestoreBanner(String(msg))
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, location.pathname, navigate])

  const isViewer = useMemo(() => String(doc?.your_role || '').toLowerCase() === 'viewer', [doc])

  const handleSave = async () => {
    const result = await saveDocument(id, content)

    const time = new Date(result.updatedAt).toLocaleTimeString()
    setLastSavedText(`Last saved: ${time}`)

    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2000)
  }

  const handleRefresh = async () => 
    {
    const d = await getDocument(id)
    setDoc(d)
    setContent(d.content || '')
    const raw = d.collaborators || []
    setCollaborators(
      raw.map((c) => ({
        ...c,
        user_id: c.user_id != null ? c.user_id : c.id
      }))
    )

    const canEdit = String(d.your_role || '').toLowerCase() !== 'viewer'
    if (canEdit) {
      const result = await saveDocument(id, d.content || '')
      const time = new Date(result.updatedAt).toLocaleTimeString()
      setLastSavedText(`Last saved: ${time}`)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2000)
    }
  }

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('cn_user') || 'null')
    } catch {
      return null
    }
  }, [])

  const isDocumentOwner =currentUser && doc && Number(currentUser.id) === Number(doc.owner_id)

  const changeUserRole = async (userId, newRole) => {
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
    if (!window.confirm(`Remove ${username}'s access to this document?`)) return
    try {
      await removeUserFromDocument(id, userId)
      setCollaborators((prev) => prev.filter((c) => Number(c.user_id) !== Number(userId)))
    } catch (err) {
      alert('Could not remove user: ' + (err?.response?.data?.error || err.message))
    }
  }

  if (!doc) {
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
            <div style={{ fontSize: 18, fontWeight: 900, color: COLORS.text }}>{doc.title}</div>
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

