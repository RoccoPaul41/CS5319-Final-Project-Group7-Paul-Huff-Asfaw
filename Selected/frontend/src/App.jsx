// # this is the presentation layer entry point
// # just handles routing between pages, nothing else
// # all the real ui logic lives in the individual page files
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import DocumentsPage from './pages/DocumentsPage.jsx'
import EditorPage from './pages/EditorPage.jsx'
import VersionHistoryPage from './pages/VersionHistoryPage.jsx'
import NotificationsPage from './pages/NotificationsPage.jsx'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('cn_token')
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            localStorage.getItem('cn_token') ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
          }
        />

        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/documents"
          element={
            <PrivateRoute>
              <DocumentsPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/documents/:id"
          element={
            <PrivateRoute>
              <EditorPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/documents/:id/history"
          element={
            <PrivateRoute>
              <VersionHistoryPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <PrivateRoute>
              <NotificationsPage />
            </PrivateRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

