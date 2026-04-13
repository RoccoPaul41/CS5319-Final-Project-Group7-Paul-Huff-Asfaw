// ============================================
// CLIENT LAYER — API Service
// This is the only file that talks to the backend.
// All React pages import from here — they never
// make fetch calls directly. This represents the
// connector between the Presentation Layer (React pages)
// and the API Layer (Express server).
// ============================================

import axios from 'axios'

// Create a single axios client with a single base URL.
// We use a direct URL to match the project specification.
const client = axios.create({
  baseURL: 'http://localhost:3002/api'
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

