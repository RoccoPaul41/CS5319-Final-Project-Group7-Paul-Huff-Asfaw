// ARCHITECTURE NOTE: Layered ws://localhost:8080/ws ; Event-Driven ws://localhost:8083/ws
import { io } from 'socket.io-client'
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8080'
class SocketService {
  constructor(){ this.socket = null }
  connect(token){ this.socket = io(WS_URL,{ auth:{token}, transports:['websocket'] }); return this.socket }
  joinDocument(documentId,userId){ this.socket?.emit('join-document',{documentId,userId}) }
  leaveDocument(documentId){ this.socket?.emit('leave-document',{documentId}) }
  sendEdit(documentId,content,userId){ this.socket?.emit('document-edit',{documentId,content,userId}) }
  onDocumentUpdate(cb){ this.socket?.on('document-update',cb) }
  onUserJoined(cb){ this.socket?.on('user-joined',cb) }
  onUserLeft(cb){ this.socket?.on('user-left',cb) }
  onNotification(cb){ this.socket?.on('notification',cb) }
  disconnect(){ this.socket?.disconnect() }
}
export default new SocketService()
