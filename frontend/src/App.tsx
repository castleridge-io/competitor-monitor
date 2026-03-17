import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuthContext } from './hooks/useAuthContext'
import { Layout } from './components/Layout'
import { LoginPage } from './components/LoginPage'
import { DashboardOverview } from './pages/DashboardOverview'
import { CompetitorsPage } from './pages/CompetitorsPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'
import { TrendsPage } from './pages/TrendsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthContext()

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/dashboard" element={<Layout />}>
        <Route index element={<DashboardOverview />} />
        <Route
          path="competitors"
          element={
            <ProtectedRoute>
              <CompetitorsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports"
          element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="trends"
          element={
            <ProtectedRoute>
              <TrendsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="gaps"
          element={
            <ProtectedRoute>
              <GapsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App