// shared nav component used across all pages, reads the username from localstorage, logout just clears the token and sends you back to login
// event-driven note: nav does not change between architectures, it only depends on localstorage + routing
import { Link, useLocation, useNavigate } from 'react-router-dom'

const COLORS = {primary: '#4F46E5',surface: '#FFFFFF', border: '#E5E7EB',text: '#111827',muted: '#6B7280', danger: '#EF4444'}
export default function Navbar({ unreadCount }) 
{
  const user = JSON.parse(localStorage.getItem('cn_user') || 'null')

  const navigate = useNavigate()

  const location = useLocation()

  const linkStyle = (path) => 
    {
    const isActive =
      location.pathname === path ||
      (path === '/documents' && location.pathname.startsWith('/documents/'))

    return { padding: '0 6px',height: '56px',display: 'flex',alignItems: 'center',textDecoration: 'none',color: isActive ? COLORS.primary : COLORS.muted,borderBottom: isActive ? `2px solid ${COLORS.primary}` : '2px solid transparent',fontWeight: 600,fontSize: 14}
  }

  const handleLogout = () => {
    localStorage.removeItem('cn_token')
    localStorage.removeItem('cn_user')
    navigate('/login')
  }

  return (
    <div style={{ height: 56, background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}>
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          height: '100%',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 18, color: COLORS.text }}>CollabNotes</div>

        <div style={{ display: 'flex', gap: 16 }}>
          <Link to="/dashboard" style={linkStyle('/dashboard')}>
            Dashboard
          </Link>
          <Link to="/documents" style={linkStyle('/documents')}>
            Documents
          </Link>
          <Link to="/notifications" style={linkStyle('/notifications')}>
            Notifications
            {unreadCount > 0 ? (
              <span
                style={{
                  marginLeft: 6,
                  minWidth: 16,
                  height: 16,
                  padding: '0 5px',
                  borderRadius: 999,
                  background: COLORS.danger,
                  color: 'white',
                  fontSize: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {unreadCount}
              </span>
            ) : null}
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{user?.username || 'user'}</div>
          <button
            onClick={handleLogout}
            style={{
              height: 34,
              padding: '0 12px',
              borderRadius: 8,
              background: 'transparent',
              border: `1px solid ${COLORS.border}`,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  )
}

