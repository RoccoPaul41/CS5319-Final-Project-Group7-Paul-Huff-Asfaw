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
  const [confirmPassword, setConfirmPassword] = useState('')

  // Track UI states.
  const [loading, setLoading] = useState(false)
  const [bannerError, setBannerError] = useState('')

  // Track field-level errors for registration.
  const [fieldErrors, setFieldErrors] = useState({ username: '', email: '', password: '', confirmPassword: '' })

  const navigate = useNavigate()

  // Email regex required by your spec.
  const emailPattern = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, [])

  const resetErrors = () => {
    // Clear errors whenever the user switches modes or retries.
    setBannerError('')
    setFieldErrors({ username: '', email: '', password: '', confirmPassword: '' })
  }

  const validateRegister = () => {
    // Build a new error object for each field (used on submit).
    const errors = { username: '', email: '', password: '', confirmPassword: '' }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) {
      errors.username = 'Username must be 3-20 characters, letters/numbers/_ only'
    }

    if (!emailPattern.test(email.trim())) {
      errors.email = 'Please enter a valid email address'
    }

    if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    }

    if (confirmPassword !== password) {
      errors.confirmPassword = 'Passwords do not match'
    }

    setFieldErrors(errors)

    return !errors.username && !errors.email && !errors.password && !errors.confirmPassword
  }

  // Live rules for disabling the Create Account button
  const registerLooksGood = useMemo(() => {
    const uOk = /^[a-zA-Z0-9_]{3,20}$/.test(username.trim())
    const eOk = emailPattern.test(email.trim())
    const pOk = password.length >= 8
    const cOk = confirmPassword === password && confirmPassword.length > 0
    return uOk && eOk && pOk && cOk
  }, [username, email, password, confirmPassword, emailPattern])

  // Tiny password strength hint for the register form only
  const pwdStrength = useMemo(() => {
    if (password.length < 8) return { label: 'Too short', color: '#EF4444', width: '33%' }
    const hasNum = /\d/.test(password)
    const hasSpec = /[^A-Za-z0-9]/.test(password)
    if (hasNum && hasSpec) return { label: 'Strong', color: '#10B981', width: '100%' }
    return { label: 'Okay', color: '#EAB308', width: '66%' }
  }, [password])

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
              setConfirmPassword('')
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

        {/* Up-front checklist so people don’t guess the rules */}
        {tab === 'register' ? (
          <div
            style={{
              marginTop: 12,
              background: '#E6F1FB',
              border: '1px solid #85B7EB',
              borderRadius: 8,
              padding: 12,
              fontSize: 13,
              color: '#185FA5'
            }}
          >
            <strong>Account requirements:</strong>
            <ul style={{ margin: '6px 0 0 0', paddingLeft: 18 }}>
              <li>Username: 3-20 characters, letters / numbers / underscore, no spaces</li>
              <li>Email: must be a valid email (example@domain.com)</li>
              <li>Password: minimum 8 characters</li>
            </ul>
          </div>
        ) : null}

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              style={{ ...inputStyle, flex: 1 }}
            />
            {tab === 'register' && username.trim() ? (
              /^[a-zA-Z0-9_]{3,20}$/.test(username.trim()) ? (
                <span style={{ color: '#10B981', fontWeight: 900 }}>✓</span>
              ) : (
                <span style={{ color: COLORS.danger, fontWeight: 900 }}>✗</span>
              )
            ) : null}
          </div>
          {tab === 'register' && fieldErrors.username ? (
            <div style={{ marginTop: 6, color: COLORS.danger, fontSize: 12 }}>{fieldErrors.username}</div>
          ) : null}

          {tab === 'register' ? (
            <>
              <label style={labelStyle}>Email</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{ ...inputStyle, flex: 1 }}
                />
                {email ? (
                  emailPattern.test(email.trim()) ? (
                    <span style={{ color: '#10B981', fontWeight: 900 }}>✓</span>
                  ) : (
                    <span style={{ color: COLORS.danger, fontWeight: 900 }}>✗</span>
                  )
                ) : null}
              </div>
              {fieldErrors.email ? <div style={{ marginTop: 6, color: COLORS.danger, fontSize: 12 }}>{fieldErrors.email}</div> : null}
            </>
          ) : null}

          <label style={labelStyle}>Password</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
              style={{ ...inputStyle, flex: 1 }}
            />
            {tab === 'register' && password ? (
              password.length >= 8 ? (
                <span style={{ color: '#10B981', fontWeight: 900 }}>✓</span>
              ) : (
                <span style={{ color: COLORS.danger, fontWeight: 900 }}>✗</span>
              )
            ) : null}
          </div>
          {tab === 'register' && fieldErrors.password ? (
            <div style={{ marginTop: 6, color: COLORS.danger, fontSize: 12 }}>{fieldErrors.password}</div>
          ) : null}

          {tab === 'register' ? (
            <div style={{ marginTop: 8 }}>
              <div style={{ height: 6, borderRadius: 999, background: '#E5E7EB', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: pwdStrength.width, background: pwdStrength.color, transition: 'width 0.2s' }} />
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: pwdStrength.color, fontWeight: 700 }}>{pwdStrength.label}</div>
            </div>
          ) : null}

          {tab === 'register' ? (
            <>
              <label style={labelStyle}>Confirm password</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  type="password"
                  style={{ ...inputStyle, flex: 1 }}
                />
                {confirmPassword ? (
                  confirmPassword === password ? (
                    <span style={{ color: '#10B981', fontWeight: 900 }}>✓</span>
                  ) : (
                    <span style={{ color: COLORS.danger, fontWeight: 900 }}>✗</span>
                  )
                ) : null}
              </div>
              {fieldErrors.confirmPassword ? (
                <div style={{ marginTop: 6, color: COLORS.danger, fontSize: 12 }}>{fieldErrors.confirmPassword}</div>
              ) : null}
            </>
          ) : null}

          <button
            disabled={loading || (tab === 'register' && !registerLooksGood)}
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

