// ARCHITECTURE: Layered Client-Server
import axios from 'axios'
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const sleep = (d) => new Promise((r) => setTimeout(r, d))
let users = [{id:1,username:'rocco.paul',email:'rocco@x.com'},{id:2,username:'dan.huff',email:'dan@x.com'}]
let docs = [
  {id:1,title:'Final Project Proposal',ownerId:1,ownerName:'rocco.paul',collaborators:users,updatedAt:new Date().toISOString(),content:'Proposal'},
  {id:2,title:'Sprint Planning Notes',ownerId:1,ownerName:'rocco.paul',collaborators:[users[0]],updatedAt:new Date().toISOString(),content:'Sprint'},
  {id:3,title:'Database Schema Draft',ownerId:2,ownerName:'dan.huff',collaborators:users,updatedAt:new Date().toISOString(),content:'Schema'},
  {id:4,title:'Demo Day Talking Points',ownerId:1,ownerName:'rocco.paul',collaborators:[users[0]],updatedAt:new Date().toISOString(),content:'Demo'}
]
let revisions = { 1: [{id:11,version:6,current:true,username:'rocco.paul',change:'Edited section 2',createdAt:new Date().toISOString(),content:'v6'},{id:10,version:5,current:false,username:'dan.huff',change:'Added intro',createdAt:new Date().toISOString(),content:'v5'},{id:9,version:4,current:false,username:'rocco.paul',change:'Formatting',createdAt:new Date().toISOString(),content:'v4'},{id:8,version:3,current:false,username:'dan.huff',change:'References',createdAt:new Date().toISOString(),content:'v3'},{id:7,version:2,current:false,username:'rocco.paul',change:'Fix typos',createdAt:new Date().toISOString(),content:'v2'},{id:6,version:1,current:false,username:'rocco.paul',change:'Initial',createdAt:new Date().toISOString(),content:'v1'}] }
let notifications = [{id:1,type:'share',actor:'dan.huff',documentTitle:'Database Schema Draft',read:false,relativeTime:'2 min ago'},{id:2,type:'edit',actor:'rocco.paul',documentTitle:'Final Project Proposal',read:false,relativeTime:'14 min ago'},{id:3,type:'restore',actor:'rocco.paul',documentTitle:'Final Project Proposal',read:true,relativeTime:'1 hr ago'},{id:4,type:'edit',actor:'dan.huff',documentTitle:'Sprint Planning Notes',read:true,relativeTime:'3 hr ago'},{id:5,type:'share',actor:'rocco.paul',documentTitle:'Demo Day Talking Points',read:false,relativeTime:'Yesterday'}]
const mock = async (v, err=false) => { await sleep(400); if (err) throw v; return { data:v } }
export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
const c = axios.create({ baseURL: BASE_URL })
c.interceptors.request.use((config)=>{const t=localStorage.getItem('cn_token'); if (t) config.headers.Authorization=`Bearer ${t}`; return config})
export const login = async (username,password)=> USE_MOCK ? ((username==='rocco.paul'||username==='dan.huff')&&password==='password123'?mock({token:'mock-token',user:{id:username==='rocco.paul'?1:2,username}}):mock({response:{status:401}},true)) : c.post('/auth/login',{username,password})
export const register = async (username,email,pw)=> USE_MOCK ? mock({token:'mock-token-new',user:{id:Date.now(),username,email}}) : c.post('/auth/register',{username,email,password:pw})
export const logout = async ()=> USE_MOCK ? mock({ok:true}) : c.delete('/auth/session')
export const getDocuments = async ()=> USE_MOCK ? mock(docs) : c.get('/documents')
export const createDocument = async (title,content,visibility)=> USE_MOCK ? mock((docs=[{id:Date.now(),title,content,visibility,ownerId:1,ownerName:'rocco.paul',collaborators:[users[0]],updatedAt:new Date().toISOString()},...docs])[0]) : c.post('/documents',{title,content,visibility})
export const getDocument = async (id)=> USE_MOCK ? mock(docs.find((d)=>String(d.id)===String(id))) : c.get(`/documents/${id}`)
export const saveDocument = async (id,content)=> USE_MOCK ? mock({ok:true}) : c.put(`/documents/${id}/content`,{content})
export const deleteDocument = async (id)=> USE_MOCK ? mock((docs=docs.filter((d)=>String(d.id)!==String(id)))) : c.delete(`/documents/${id}`)
export const shareDocument = async (id,payload)=> USE_MOCK ? mock({ok:true}) : c.post(`/documents/${id}/share`,payload)
export const searchUsers = async (query)=> USE_MOCK ? mock(users.filter((u)=>`${u.username} ${u.email}`.toLowerCase().includes(query.toLowerCase()))) : c.get(`/users/search?q=${encodeURIComponent(query)}`)
export const getRevisions = async (id)=> USE_MOCK ? mock(revisions[id]||[]) : c.get(`/documents/${id}/revisions`)
export const restoreRevision = async (docId,revId)=> USE_MOCK ? mock({ok:true,revisionId:revId}) : c.post(`/documents/${docId}/restore`,{revisionId:revId})
export const getNotifications = async ()=> USE_MOCK ? mock(notifications) : c.get('/notifications')
export const markAllRead = async ()=> USE_MOCK ? mock((notifications=notifications.map((n)=>({...n,read:true})))) : c.patch('/notifications/read-all')
