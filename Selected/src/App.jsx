/* File: src/App.jsx
 * ARCHITECTURE (Layered): React UI -> api service -> monolith service chain.
 * ARCHITECTURE (Event-Driven): same UI contract; write calls trigger domain events.
 * Service communication: Context + API + WebSocket.
 * Events/Methods: REST methods in layered, event publication/consumption in EDA.
 */
import { BrowserRouter,Navigate,Route,Routes,useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import Toast from './components/Toast'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import EditorPage from './pages/EditorPage'
import VersionHistoryPage from './pages/VersionHistoryPage'
import NotificationsPage from './pages/NotificationsPage'
function PrivateRoute({children}){const t=localStorage.getItem('cn_token'); const location=useLocation(); if(!t) return <Navigate to='/login' state={{from:location}} replace/>; return children}
function AppRoutes(){return <Routes><Route path='/login' element={<LoginPage/>}/><Route path='/dashboard' element={<PrivateRoute><DashboardPage/></PrivateRoute>}/><Route path='/documents/new' element={<PrivateRoute><DashboardPage/></PrivateRoute>}/><Route path='/documents/:id' element={<PrivateRoute><EditorPage/></PrivateRoute>}/><Route path='/documents/:id/history' element={<PrivateRoute><VersionHistoryPage/></PrivateRoute>}/><Route path='/notifications' element={<PrivateRoute><NotificationsPage/></PrivateRoute>}/><Route path='/' element={<Navigate to='/dashboard' replace/>}/></Routes>}
export default function App(){return <BrowserRouter><AuthProvider><ToastProvider><AppRoutes/><Toast/></ToastProvider></AuthProvider></BrowserRouter> }
