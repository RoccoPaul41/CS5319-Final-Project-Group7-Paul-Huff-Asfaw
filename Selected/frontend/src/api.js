// ============================================
// CLIENT LAYER — API Service
// This is the only file that talks to the backend.
// All React pages import from here — they never
// make fetch calls directly. This represents the
// connector between the Presentation Layer (React pages)
// and the API Layer (Express server).
// ============================================

import axios from 'axios'

// Relative "/api" hits the Vite dev/preview proxy (see vite.config.js) so you always reach the Node API.
// Static deploy on another host: set VITE_API_BASE at build time (e.g. https://api.example.com/api).
const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api'
})

// Attach the JWT token to every request automatically.
client.interceptors.request.use((config) => {
  // Read the token from localStorage.
  const token = localStorage.getItem('cn_token')

  // If we have a token, send it as a Bearer token.
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// If the server rejects the JWT (new JWT_SECRET, expiry, etc.), drop stale auth instead of a broken dashboard
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg = error.response?.data?.error
    if (error.response?.status === 403 && msg === 'Invalid or expired token') {
      localStorage.removeItem('cn_token')
      localStorage.removeItem('cn_user')
      if (!window.location.pathname.includes('/login')) {
        window.location.replace('/login')
      }
    }
    return Promise.reject(error)
  }
)

// ----------------------------
// Auth
// ----------------------------

export const registerUser = async (username, email, password) => {
  // Send registration data to the server.
  const res = await client.post('/auth/register', { username, email, password })
  return res.data
}

export const loginUser = async (username, password) => {
  // Send login credentials to the server.
  const res = await client.post('/auth/login', { username, password })
  return res.data
}

// ----------------------------
// Documents
// ----------------------------

export const getDocuments = async () => {
  // Fetch all documents the user can access.
  const res = await client.get('/documents')
  return res.data
}

export const createDocument = async (title, visibility) => {
  // Create a new document with a title and visibility.
  const res = await client.post('/documents', { title, visibility })
  return res.data
}

export const getDocument = async (id) => {
  // Load a single document by id.
  const res = await client.get(`/documents/${id}`)
  return res.data
}

export const saveDocument = async (id, content) => {
  // Save document content.
  const res = await client.put(`/documents/${id}/content`, { content })
  return res.data
}

export const deleteDocument = async (id) => {
  // Delete a document by id.
  const res = await client.delete(`/documents/${id}`)
  return res.data
}

export const shareDocument = async (id, username, role) => {
  // Share a document with another user.
  const res = await client.post(`/documents/${id}/share`, { username, role })
  return res.data
}

export const searchUsers = async (query) => {
  // Search for users by username to support sharing UI.
  const res = await client.get(`/users/search?q=${encodeURIComponent(query)}`)
  return res.data
}

// ----------------------------
// Revisions
// ----------------------------

export const getRevisions = async (id) => {
  // Fetch revision history for a document.
  const res = await client.get(`/documents/${id}/revisions`)
  return res.data
}

export const restoreRevision = async (documentId, revisionId) => {
  // Restore a prior revision.
  const res = await client.post(`/documents/${documentId}/restore`, { revisionId })
  return res.data
}

// ----------------------------
// Notifications
// ----------------------------

export const getNotifications = async () => {
  // Fetch all notifications for the logged-in user.
  const res = await client.get('/notifications')
  return res.data
}

export const markAllRead = async () => {
  // Mark all notifications as read.
  const res = await client.patch('/notifications/read-all')
  return res.data
}

// Mark a single notification as read by its ID
export const markOneRead = async (notifId) => {
  const res = await client.patch(`/notifications/${notifId}/read`)
  return res.data
}

// Update a collaborator's role on a document
export const updateUserRole = async (documentId, userId, role) => {
  const res = await client.patch(`/documents/${documentId}/acl/${userId}`, { role })
  return res.data
}

// Remove a user's access from a document
export const removeUserFromDocument = async (documentId, userId) => {
  const res = await client.delete(`/documents/${documentId}/acl/${userId}`)
  return res.data
}

