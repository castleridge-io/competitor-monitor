import { useEffect, useState } from 'react'
import { apiClient } from '../utils/api'
import type { Competitor, NewCompetitor } from '../types'

export function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCompetitor, setEditingCompetitor] = useState<Competitor | null>(null)
  const [formData, setFormData] = useState<NewCompetitor>({ name: '', url: '' })

  const fetchCompetitors = async () => {
    try {
      setLoading(true)
      const data = await apiClient.getCompetitors()
      setCompetitors(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load competitors')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompetitors()
  }, [])

  const handleCreate = async (data: NewCompetitor) => {
    await apiClient.createCompetitor(data)
    setIsModalOpen(false)
    setFormData({ name: '', url: '' })
    await fetchCompetitors()
  }

  const handleUpdate = async (id: string, data: Partial<NewCompetitor>) => {
    await apiClient.updateCompetitor(id, data)
    setEditingCompetitor(null)
    await fetchCompetitors()
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this competitor?')) return
    await apiClient.deleteCompetitor(id)
    await fetchCompetitors()
  }

  const handleScrape = async (id: string) => {
    try {
      await apiClient.triggerScrape(id)
      alert('Scrape completed successfully!')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Scrape failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading competitors...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error: {error}</p>
        <button
          onClick={fetchCompetitors}
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
          <h1 className="text-2xl font-bold text-gray-900">Competitors</h1>
          <p className="text-gray-600 mt-1">Manage your competitor monitoring list</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Add Competitor
        </button>
      </div>

      {competitors.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No competitors yet. Add your first competitor to start monitoring.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Add Competitor
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {competitors.map((competitor) => (
                <tr key={competitor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">{competitor.name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <a
                      href={competitor.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      {competitor.url}
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(competitor.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleScrape(competitor.id)}
                      className="text-green-600 hover:text-green-700"
                    >
                      Scrape
                    </button>
                    <button
                      onClick={() => {
                        setEditingCompetitor(competitor)
                        setFormData({ name: competitor.name, url: competitor.url })
                      }}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(competitor.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(isModalOpen || editingCompetitor) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingCompetitor ? 'Edit Competitor' : 'Add Competitor'}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (editingCompetitor) {
                  handleUpdate(editingCompetitor.id, formData)
                } else {
                  handleCreate(formData)
                }
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                  required
                />
              </div>
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                  URL
                </label>
                <input
                  type="url"
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false)
                    setEditingCompetitor(null)
                    setFormData({ name: '', url: '' })
                  }}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}