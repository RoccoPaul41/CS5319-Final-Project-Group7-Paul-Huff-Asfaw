// ============================================
// PRESENTATION LAYER — Version History Page
// This is the CLIENT side of the Layered Architecture.
// Responsibility: Show UI and handle user interactions.
// All data comes from api.js — no direct DB or server calls.
// ============================================

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
  // Read the document id from the URL.
  const { id } = useParams()

  // Router helper for navigation.
  const navigate = useNavigate()

  // Store the document title for the header.
  const [documentTitle, setDocumentTitle] = useState('')

  // Store revisions newest-first.
  const [revisions, setRevisions] = useState([])

  // Store unread count for navbar badge.
  const [unreadCount, setUnreadCount] = useState(0)

  const load = async () => {
    // Load document, revisions, and notifications in parallel.
    const [doc, revs, notifs] = await Promise.all([getDocument(id), getRevisions(id), getNotifications()])

    // Save the title for the header.
    setDocumentTitle(doc.title || '')

    // Save revision list.
    setRevisions(revs)

    // Compute unread badge count.
    setUnreadCount(notifs.filter((n) => !n.is_read).length)
  }

  useEffect(() => {
    // Load the page data when the page opens.
    load().catch((e) => console.error(e))
  }, [id])

  const handleRestore = async (revision) => {
    // Confirm before restoring, as requested.
    const ok = window.confirm(`Restore to v${revision.version_number}? This will create a new version.`)
    if (!ok) return

    // Ask the API layer to restore.
    await restoreRevision(id, revision.id)

    // Navigate back to the editor after restoring.
    navigate(`/documents/${id}`)
  }

  return (
    <div style={{ background: COLORS.background, minHeight: '100vh' }}>
      <Navbar unreadCount={unreadCount} />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 16 }}>
        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: COLORS.text }}>Version History — {documentTitle}</div>
          <button
            onClick={() => navigate(`/documents/${id}`)}
            style={{ height: 34, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: 'transparent', cursor: 'pointer', fontWeight: 900 }}
          >
            Back to editor
          </button>
        </div>

        {/* Revisions list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {revisions.map((rev, index) => {
            // Treat the newest revision as “current”.
            const isCurrent = index === 0

            return (
              <div key={rev.id} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 900, color: COLORS.text }}>
                    v{rev.version_number} {isCurrent ? '(Current)' : ''}
                  </div>

                  {!isCurrent ? (
                    <button
                      onClick={() => handleRestore(rev)}
                      style={{ height: 32, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: 'transparent', cursor: 'pointer', fontWeight: 900 }}
                    >
                      Restore
                    </button>
                  ) : (
                    <div style={{ fontSize: 12, fontWeight: 900, color: '#10B981' }}>Current</div>
                  )}
                </div>

                <div style={{ marginTop: 6, color: COLORS.muted, fontSize: 13 }}>
                  {rev.created_by_username} · {new Date(rev.created_at).toLocaleString()}
                </div>

                <div style={{ marginTop: 8, color: COLORS.text, fontSize: 14 }}>{rev.change_description || 'Saved'}</div>
              </div>
            )
          })}
        </div>

        {revisions.length === 0 ? <div style={{ marginTop: 12, color: COLORS.muted }}>No revisions yet.</div> : null}
      </div>
    </div>
  )
}

