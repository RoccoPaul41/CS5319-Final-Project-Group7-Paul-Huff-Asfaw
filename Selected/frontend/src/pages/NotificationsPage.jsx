// ============================================
// PRESENTATION LAYER — Notifications Page
// This is the CLIENT side of the Layered Architecture.
// Responsibility: Show UI and handle user interactions.
// All data comes from api.js — no direct DB or server calls.
// ============================================

import { useEffect, useMemo, useState } from 'react'
import Navbar from '../components/Navbar.jsx'
import { getNotifications, markAllRead } from '../api.js'

const COLORS = {
  primary: '#4F46E5',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  muted: '#6B7280'
}

function timeAgo(iso) {
  // Convert timestamp into a short relative label.
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (Number.isNaN(minutes)) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hr ago`
  return 'Yesterday'
}

export default function NotificationsPage() {
  // Store notifications from the server.
  const [notifications, setNotifications] = useState([])

  // Store which filter tab is selected.
  const [filter, setFilter] = useState('all') // all | shares | edits | restores

  const load = async () => {
    // Load notifications from the API layer.
    const data = await getNotifications()
    setNotifications(data)
  }

  useEffect(() => {
    // Load notifications when the page opens.
    load().catch((e) => console.error(e))
  }, [])

  // Compute unread badge for the navbar.
  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications])

  // Filter notifications client-side, as requested.
  const filtered = useMemo(() => {
    if (filter === 'all') return notifications
    // Backend enum values are lowercase, per your schema.
    if (filter === 'shares') return notifications.filter((n) => n.type === 'document_shared')
    if (filter === 'edits') return notifications.filter((n) => n.type === 'document_edited')
    if (filter === 'restores') return notifications.filter((n) => n.type === 'version_restored')
    return notifications
  }, [notifications, filter])

  const handleMarkAllRead = async () => {
    // Tell the API to mark all notifications as read.
    await markAllRead()

    // Reload so the UI updates.
    await load()
  }

  return (
    <div style={{ background: COLORS.background, minHeight: '100vh' }}>
      <Navbar unreadCount={unreadCount} />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: COLORS.text }}>Notifications</div>
          <button
            onClick={handleMarkAllRead}
            style={{
              height: 34,
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: 900
            }}
          >
            Mark all as read
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 16, borderBottom: `1px solid ${COLORS.border}`, marginBottom: 12 }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'shares', label: 'Shares' },
            { key: 'edits', label: 'Edits' },
            { key: 'restores', label: 'Restores' }
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '10px 0',
                cursor: 'pointer',
                fontWeight: 900,
                color: filter === t.key ? COLORS.primary : COLORS.muted,
                borderBottom: filter === t.key ? `2px solid ${COLORS.primary}` : '2px solid transparent'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Notifications list */}
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12 }}>
          {filtered.map((n) => (
            <div
              key={n.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                padding: 12,
                borderBottom: `1px solid ${COLORS.border}`,
                background: 'white'
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: COLORS.text }}>{n.message}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: COLORS.muted }}>{timeAgo(n.created_at)}</div>
              </div>

              {!n.is_read ? (
                <div style={{ width: 8, height: 8, borderRadius: 999, background: COLORS.primary, marginTop: 6 }} />
              ) : (
                <div style={{ width: 8, height: 8 }} />
              )}
            </div>
          ))}

          {filtered.length === 0 ? <div style={{ padding: 16, color: COLORS.muted }}>No notifications.</div> : null}
        </div>
      </div>
    </div>
  )
}

