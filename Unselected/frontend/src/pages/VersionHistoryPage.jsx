// # presentation layer - version history
// # every save creates a row in the revisions table
// # restoring just copies old content into a new revision
// # the actual restore logic lives in the api layer
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { getDocument, getNotifications, getRevisions, restoreRevision } from '../api.js'

const COLORS = {
  primary: '#4F46E5',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  muted: '#6B7280'
}

export default function VersionHistoryPage() {
  const { id } = useParams()

  const navigate = useNavigate()

  const [title, setTitle] = useState('')

  const [revisions, setRevisions] = useState([])

  const [unreadCount, setUnreadCount] = useState(0)

  const [previewId, setPreviewId] = useState(null)

  const [hoverPreviewId, setHoverPreviewId] = useState(null)

  const [restoringId, setRestoringId] = useState(null)

  const load = async () => {
    const [doc, revs, notifs] = await Promise.all([getDocument(id), getRevisions(id), getNotifications()])

    setTitle(doc.title || '')

    setRevisions(revs)

    setUnreadCount(notifs.filter((n) => !n.is_read).length)
  }

  useEffect(() => {
    load().catch((e) => console.error(e))
  }, [id])

  const handleRestore = async (revision, e) => {
    if (e) e.stopPropagation()
    const ok = window.confirm(
      `Restore to version ${revision.version_number}? This will create a new version with the old content. Your current version will not be lost.`
    )
    if (!ok) return

    setRestoringId(revision.id)
    try {
      await restoreRevision(id, revision.id)
      navigate(`/documents/${id}`, {
        state: { restoreMessage: `Restored from version ${revision.version_number}. Open Save if you want to tweak further.` }
      })
    } catch (err) {
      alert(err?.response?.data?.error || err.message || 'Restore failed')
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <div style={{ background: COLORS.background, minHeight: '100vh' }}>
      <Navbar unreadCount={unreadCount} />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: COLORS.text }}>Version History — {title}</div>
          <button
            onClick={() => navigate(`/documents/${id}`)}
            style={{ height: 34, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: 'transparent', cursor: 'pointer', fontWeight: 900 }}
          >
            Back to editor
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {revisions.map((rev, index) => {
            const isCurrent = index === 0
            const snippet = String(rev.content || '').slice(0, 200)

            return (
              <div
                key={rev.id}
                role="presentation"
                onMouseEnter={() => setHoverPreviewId(rev.id)}
                onMouseLeave={() => setHoverPreviewId(null)}
                onClick={() => setPreviewId((prev) => (prev === rev.id ? null : rev.id))}
                onKeyDown={() => {}}
                style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 14, cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 900, color: COLORS.text }}>
                    v{rev.version_number}
                    {isCurrent ? <span style={{ marginLeft: 8, fontSize: 13, color: '#10B981' }}>Current Version</span> : null}
                  </div>

                  {!isCurrent ? (
                    <button
                      type="button"
                      disabled={restoringId != null}
                      onClick={(e) => handleRestore(rev, e)}
                      style={{
                        height: 32,
                        borderRadius: 8,
                        border: `1px solid ${COLORS.border}`,
                        background: 'transparent',
                        cursor: restoringId != null ? 'wait' : 'pointer',
                        fontWeight: 900,
                        opacity: restoringId === rev.id ? 0.6 : 1
                      }}
                    >
                      {restoringId === rev.id ? 'Restoring…' : 'Restore'}
                    </button>
                  ) : null}
                </div>

                <div style={{ marginTop: 6, color: COLORS.muted, fontSize: 13 }}>
                  {rev.created_by_username} · {new Date(rev.created_at).toLocaleString()}
                </div>

                <div style={{ marginTop: 8, color: COLORS.text, fontSize: 14 }}>{rev.change_description || 'Saved'}</div>

                {previewId === rev.id || hoverPreviewId === rev.id ? (
                  <div
                    style={{
                      marginTop: 10,
                      padding: 10,
                      borderRadius: 8,
                      background: '#F3F4F6',
                      color: COLORS.muted,
                      fontSize: 13,
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {snippet || '(empty)'}
                    {String(rev.content || '').length > 200 ? '…' : ''}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>

        {revisions.length === 0 ? <div style={{ marginTop: 12, color: COLORS.muted }}>No revisions yet.</div> : null}
      </div>
    </div>
  )
}

