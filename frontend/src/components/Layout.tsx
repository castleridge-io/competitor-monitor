import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthContext } from '../hooks/useAuthContext'

export function Layout() {
  const { isAuthenticated, logout } = useAuthContext()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/dashboard')
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-2 rounded-lg transition-colors ${
      isActive
        ? 'bg-primary-100 text-primary-700'
        : 'text-gray-600 hover:bg-gray-100'
    }`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                <NavLink to="/dashboard">Competitor Monitor</NavLink>
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Logout
                </button>
              ) : (
                <NavLink
                  to="/dashboard"
                  className="text-primary-600 hover:text-primary-700"
                >
                  Login
                </NavLink>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <nav className="w-full md:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-4">
              <ul className="space-y-1">
                <li>
                  <NavLink to="/dashboard" className={navLinkClass} end>
                    Dashboard
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/dashboard/competitors" className={navLinkClass}>
                    Competitors
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/dashboard/reports" className={navLinkClass}>
                    Reports
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/dashboard/trends" className={navLinkClass}>
                    Trends
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/dashboard/gaps" className={navLinkClass}>
                    Feature Gaps
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/dashboard/settings" className={navLinkClass}>
                    Settings
                  </NavLink>
                </li>
              </ul>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}