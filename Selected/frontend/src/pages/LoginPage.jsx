// ============================================
// PRESENTATION LAYER — Login Page
// This is the CLIENT side of the Layered Architecture.
// Responsibility: Show UI and handle user interactions.
// All data comes from api.js — no direct DB or server calls.
// ============================================

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser, registerUser } from '../api.js'

const COLORS = {
  primary: '#4F46E5',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  muted: '#6B7280',
  danger: '#EF4444'
}

export default function LoginPage() {
  // Track which tab the user is on.
  const [tab, setTab] = useState('login')

  // Track inputs.
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Track UI states.
  const [loading, setLoading] = useState(false)
  const [bannerError, setBannerError] = useState('')

  // Track field-level errors for registration.
  const [fieldErrors, setFieldErrors] = useState({ username: '', email: '', password: '' })

  const navigate = useNavigate()

  // Email regex required by your spec.
  const emailPattern = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, [])

  const resetErrors = () => {
    // Clear errors whenever the user switches modes or retries.
    setBannerError('')
    setFieldErrors({ username: '', email: '', password: '' })
  }

  const validateRegister = () => {
    // Build a new error object for each field.
    const errors = { username: '', email: '', password: '' }

    // Username must exist.
    if (!username.trim()) {
      errors.username = 'Username is required'
    }

    // Email must match the required regex.
    if (!emailPattern.test(email.trim())) {
      errors.email = 'Email must look like example@domain.com'
    }

    // Password must be at least 8 characters.
    if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    }

    // Store errors so we can display them in the UI.
    setFieldErrors(errors)

    // Validation passes only if every error is empty.
    return !errors.username && !errors.email && !errors.password
  }

  const handleLogin = async (e) => {
    // Prevent the browser from reloading the page.
    e.preventDefault()

    // Reset any old errors before a new attempt.
    resetErrors()
    setLoading(true)

    try {
      // Ask the API layer to authenticate the user.
      const data = await loginUser(username.trim(), password)

      // Save token and user so the router can protect routes.
      localStorage.setItem('cn_token', data.token)
      localStorage.setItem('cn_user', JSON.stringify(data.user))

      // Send the user to the dashboard.
      navigate('/dashboard')
    } catch (err) {
      // Show the server’s message if available.
      const message = err?.response?.data?.error || 'Login failed'
      setBannerError(message)
    } finally {
      // Always stop the loading state.
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    // Prevent the browser from reloading the page.
    e.preventDefault()

    // Reset any old errors before a new attempt.
    resetErrors()

    // Stop early if validation fails.
    if (!validateRegister()) return

    setLoading(true)
    try {
      // Create the account first.
      await registerUser(username.trim(), email.trim(), password)

      // Immediately log in after registration (nice UX).
      const data = await loginUser(username.trim(), password)

      // Persist auth data.
      localStorage.setItem('cn_token', data.token)
      localStorage.setItem('cn_user', JSON.stringify(data.user))

      // Go to dashboard.
      navigate('/dashboard')
    } catch (err) {
      const message = err?.response?.data?.error || 'Registration failed'
      setBannerError(message)
    } finally {
      setLoading(false)
    }
  }

  const cardStyle = {
    width: 400,
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: 24
  }

  const inputStyle = {
    width: '100%',
    height: 42,
    borderRadius: 8,
    border: `1px solid ${COLORS.border}`,
    padding: '0 12px',
    fontSize: 14
  }

  const labelStyle = {
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.text,
    marginTop: 14,
    display: 'block'
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: COLORS.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div style={cardStyle}>
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 16, borderBottom: `1px solid ${COLORS.border}`, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => {
              setTab('login')
              resetErrors()
            }}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px 0',
              fontWeight: 700,
              cursor: 'pointer',
              color: tab === 'login' ? COLORS.primary : COLORS.muted,
              borderBottom: tab === 'login' ? `2px solid ${COLORS.primary}` : '2px solid transparent'
            }}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('register')
              resetErrors()
            }}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px 0',
              fontWeight: 700,
              cursor: 'pointer',
              color: tab === 'register' ? COLORS.primary : COLORS.muted,
              borderBottom: tab === 'register' ? `2px solid ${COLORS.primary}` : '2px solid transparent'
            }}
          >
            Register
          </button>
        </div>

        {/* Title */}
        <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.text }}>
          {tab === 'login' ? 'Welcome back' : 'Create an account'}
        </div>

        {tab === 'login' ? <div style={{ marginTop: 6, fontSize: 14, color: COLORS.muted }}>Sign in to access your documents</div> : null}

        {/* Banner error */}
        {bannerError ? (
          <div
            style={{
              marginTop: 14,
              background: '#FEF3C7',
              borderLeft: '4px solid #F59E0B',
              padding: 12,
              borderRadius: 8,
              color: '#92400E',
              fontSize: 13
            }}
          >
            {bannerError}
          </div>
        ) : null}

        {/* Form */}
        <form onSubmit={tab === 'login' ? handleLogin : handleRegister}>
          <label style={labelStyle}>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            style={inputStyle}
          />
          {tab === 'register' && fieldErrors.username ? (
            <div style={{ marginTop: 6, color: COLORS.danger, fontSize: 12 }}>{fieldErrors.username}</div>
          ) : null}

          {tab === 'register' ? (
            <>
              <label style={labelStyle}>Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
              {fieldErrors.email ? <div style={{ marginTop: 6, color: COLORS.danger, fontSize: 12 }}>{fieldErrors.email}</div> : null}
            </>
          ) : null}

          <label style={labelStyle}>Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type="password" style={inputStyle} />
          {tab === 'register' && fieldErrors.password ? (
            <div style={{ marginTop: 6, color: COLORS.danger, fontSize: 12 }}>{fieldErrors.password}</div>
          ) : null}

          <button
            disabled={loading}
            style={{
              marginTop: 18,
              width: '100%',
              height: 42,
              borderRadius: 8,
              border: 'none',
              background: COLORS.primary,
              color: 'white',
              fontWeight: 800,
              cursor: 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {tab === 'login' ? (loading ? 'Signing in...' : 'Sign In') : loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}

