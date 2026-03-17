import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '../utils/api'
import type { ReportListItem, Competitor } from '../types'

export function ReportsPage() {
  const [reports, setReports] = useState<ReportListItem[]>([])
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterCompetitor, setFilterCompetitor] = useState<string>('all')

  useEffect(() => {
    async function fetchData() {
      try {
        const [reportsData, competitorsData] = await Promise.all([
          apiClient.getReports(),
          apiClient.getCompetitors(),
        ])
        setReports(reportsData)
        setCompetitors(competitorsData)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reports')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const getCompetitorName = (id: string) => {
    const competitor = competitors.find((c) => c.id === id)
    return competitor?.name ?? id
  }

  const handleToggleVisibility = async (reportId: string, currentVisibility: boolean) => {
    try {
      await apiClient.updateReportVisibility(reportId, !currentVisibility)
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId ? { ...r, isPublic: !currentVisibility } : r
        )
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update visibility')
    }
  }

  const filteredReports = filterCompetitor === 'all'
    ? reports
    : reports.filter((r) => r.competitorId === filterCompetitor)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading reports...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error: {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-red-600 underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">View and manage scraping reports</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <label htmlFor="competitor-filter" className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Competitor
        </label>
        <select
          id="competitor-filter"
          value={filterCompetitor}
          onChange={(e) => setFilterCompetitor(e.target.value)}
          className="block w-full md:w-64 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
          aria-label="Filter by competitor"
        >
          <option value="all">All Competitors</option>
          {competitors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No reports yet. Run a scrape to generate reports.</p>
          <Link
            to="/dashboard/competitors"
            className="mt-4 inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Go to Competitors
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Competitor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visibility
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono text-gray-900">{report.id}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {getCompetitorName(report.competitorId)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        report.isPublic
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {report.isPublic ? 'Public' : 'Private'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleToggleVisibility(report.id, report.isPublic)}
                      className={report.isPublic ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}
                    >
                      {report.isPublic ? 'Make Private' : 'Make Public'}
                    </button>
                    <Link
                      to={`/dashboard/reports/${report.id}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}