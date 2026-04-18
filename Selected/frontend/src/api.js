import axios from 'axios'

// this is the only file that talks to the backend
//all the pages import from here instead of making their own fetch calls - keeps things organized
// this represents the connector between the presentation layer (the pages) and the api layer (server.js)
const client = axios.create({baseURL: import.meta.env.VITE_API_BASE || '/api'})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('cn_token')

  if (token) 
  {
    config.headers.Authorization =`Bearer ${token}`
  }

  return config
})

//if the token is bad/ or expired, dump it so the app doesn't get stuck
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg = error.response?.data?.error
    if (error.response?.status === 403 && msg === 'Invalid or expired token') {
      localStorage.removeItem('cn_token')
      localStorage.removeItem('cn_user')
      if ( !window.location.pathname.includes('/login')) 
        {
        window.location.replace('/login')
      }
    }
    return Promise.reject( error)
  }
)

export const registerUser=async (username, email, password) => 
  {
  const res = await client.post('/auth/register', { username, email, password })
  return res.data
}

export const loginUser= async(username, password) => {
  const res = await client.post('/auth/login', { username, password })
  return res.data
}

export const getDocuments = async () => 
  {
  const res = await client.get('/documents')
  return res.data
}

export const createDocument = async (title, visibility) => 
  {const res= await client.post('/documents', { title, visibility })
  return res.data
}

export const getDocument = async (id) => {
  
  const res= await client.get(`/documents/${id}`)
  return res.data
}

export const saveDocument = async (id, content) => 
  {
  const res =await client.put(`/documents/${id}/content`, { content })
  return res.data
}

export const deleteDocument = async (id) => 
  {
  const res= await client.delete(`/documents/${id}`)
  return res.data
}

export const shareDocument =async (id, username, role) => 
  {
  const res = await client.post(`/documents/${id}/share`, { username, role })
  return res.data
}

export const searchUsers = async (query) => {
  const res = await client.get(`/users/search?q=${encodeURIComponent(query)}`)
  return res.data
}

export const getRevisions = async (id) => {
  const res = await client.get(`/documents/${id}/revisions`)
  return res.data
}

export const restoreRevision = async (documentId, revisionId) => {
  const res = await client.post(`/documents/${documentId}/restore`, { revisionId })
  return res.data
}

export const getNotifications = async () => {
  const res = await client.get('/notifications')
  return res.data
}

export const markAllRead = async () =>
   {
  const res= await client.patch('/notifications/read-all')
  return res.data
}

//mark a singular notification as read
export const markOneRead= async (notifId) => 
  {
  const res =await client.patch(`/notifications/${notifId}/read`)
  return res.data
}

export const updateUserRole= async (documentId, userId, role) => {
  const res = await client.patch(`/documents/${documentId}/acl/${userId}`, { role })
  return res.data
}

export const removeUserFromDocument = async (documentId, userId) => 
  {
  const res =await client.delete(`/documents/${documentId}/acl/${userId}`)
  return res.data
}

