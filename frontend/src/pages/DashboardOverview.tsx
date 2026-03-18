import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '../utils/api'
import type { Competitor, ReportListItem } from '../types'

interface DashboardStats {
  totalCompetitors: number
  totalReports: number
  recentReports: ReportListItem[]
}

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [competitors, reports] = await Promise.all([
          apiClient.getCompetitors(),
          apiClient.getReports(),
        ])

        setStats({
          totalCompetitors: competitors.length,
          totalReports: reports.length,
          recentReports: reports.slice(0, 5),
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your competitor monitoring</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Competitors"
          value={stats?.totalCompetitors ?? 0}
          icon="🏢"
        />
        <StatCard
          title="Total Reports"
          value={stats?.totalReports ?? 0}
          icon="📊"
        />
        <StatCard
          title="Recent Changes"
          value={stats?.recentReports.length ?? 0}
          icon="📈"
        />
        <StatCard
          title="Active Alerts"
          value={0}
          icon="🔔"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/dashboard/competitors"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Add Competitor
          </Link>
          <Link
            to="/dashboard/competitors"
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Run Scrape
          </Link>
          <Link
            to="/dashboard/timeline"
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            View Timeline
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        {stats?.recentReports.length ? (
          <div className="space-y-3">
            {stats.recentReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Report for {report.competitorId}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  to={`/dashboard/reports/${report.id}`}
                  className="text-primary-600 hover:text-primary-700 text-sm"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No recent activity</p>
        )}
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: number
  icon: string
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  )
}