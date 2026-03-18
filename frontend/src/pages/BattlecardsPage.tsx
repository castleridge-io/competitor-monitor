import { useEffect, useState } from 'react'
import { apiClient } from '../utils/api'
import type { Competitor, Battlecard, UpdateBattlecard } from '../types'

export function BattlecardsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [battlecards, setBattlecards] = useState<Battlecard[]>([])
  const [selectedBattlecard, setSelectedBattlecard] = useState<Battlecard | null>(null)
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<UpdateBattlecard>({})
  const [error, setError] = useState<string | null>(null)
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [filterCompetitorId, setFilterCompetitorId] = useState<string>('')

  // Load competitors and battlecards
  useEffect(() => {
    async function loadData() {
      try {
        const [competitorsData, battlecardsData] = await Promise.all([
          apiClient.getCompetitors(),
          apiClient.getBattlecards(),
        ])
        setCompetitors(competitorsData)
        setBattlecards(battlecardsData)
        if (competitorsData.length > 0) {
          setSelectedCompetitorId(competitorsData[0].id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Generate new battlecard
  const handleGenerate = async () => {
    if (!selectedCompetitorId) {
      setError('Please select a competitor')
      return
    }

    try {
      setGenerating(true)
      setError(null)

      const result = await apiClient.generateBattlecard({
        competitorId: selectedCompetitorId,
      })

      // Refresh battlecards list
      const battlecardsData = await apiClient.getBattlecards()
      setBattlecards(battlecardsData)
      setSelectedBattlecard(result)
      setShowGenerateDialog(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate battlecard')
    } finally {
      setGenerating(false)
    }
  }

  // View battlecard details
  const handleViewBattlecard = async (id: string) => {
    try {
      setLoading(true)
      const result = await apiClient.getBattlecard(id)
      setSelectedBattlecard(result)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load battlecard')
    } finally {
      setLoading(false)
    }
  }

  // Delete battlecard
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this battlecard?')) {
      return
    }

    try {
      await apiClient.deleteBattlecard(id)
      const battlecardsData = await apiClient.getBattlecards()
      setBattlecards(battlecardsData)
      if (selectedBattlecard?.id === id) {
        setSelectedBattlecard(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete battlecard')
    }
  }

  // Start editing
  const handleStartEdit = () => {
    if (selectedBattlecard) {
      setEditData({
        title: selectedBattlecard.title,
        summary: selectedBattlecard.summary,
        strengths: selectedBattlecard.strengths,
        weaknesses: selectedBattlecard.weaknesses,
        winStrategies: selectedBattlecard.winStrategies,
      })
      setEditing(true)
    }
  }

  // Save edits
  const handleSaveEdit = async () => {
    if (!selectedBattlecard) return

    try {
      setLoading(true)
      const updated = await apiClient.updateBattlecard(selectedBattlecard.id, editData)
      setSelectedBattlecard(updated)
      
      // Refresh list
      const battlecardsData = await apiClient.getBattlecards()
      setBattlecards(battlecardsData)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setLoading(false)
    }
  }

  // Cancel editing
  const handleCancelEdit = () => {
    setEditing(false)
    setEditData({})
  }

  // Export to PDF (simple print-based approach)
  const handleExport = () => {
    window.print()
  }

  // Filter battlecards
  const filteredBattlecards = filterCompetitorId
    ? battlecards.filter(bc => bc.competitorId === filterCompetitorId)
    : battlecards

  if (loading && competitors.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
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

  if (competitors.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Competitive Battlecards</h1>
          <p className="text-gray-600 mt-1">AI-powered competitive intelligence for sales teams</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500">
            No competitors available. Add competitors first to generate battlecards.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Competitive Battlecards</h1>
          <p className="text-gray-600 mt-1">AI-powered competitive intelligence for sales teams</p>
        </div>
        <button
          onClick={() => setShowGenerateDialog(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <span>+</span>
          <span>Generate New</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Battlecards List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="mb-4">
              <label htmlFor="filter-competitor" className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Competitor
              </label>
              <select
                id="filter-competitor"
                value={filterCompetitorId}
                onChange={(e) => setFilterCompetitorId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Competitors</option>
                {competitors.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              {filteredBattlecards.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No battlecards yet. Generate one to get started!
                </p>
              ) : (
                filteredBattlecards.map((bc) => (
                  <div
                    key={bc.id}
                    className={`border rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-colors ${
                      selectedBattlecard?.id === bc.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                    onClick={() => handleViewBattlecard(bc.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{bc.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{bc.competitorName}</p>
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{bc.summary}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(bc.id)
                        }}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Battlecard Detail View */}
        <div className="lg:col-span-2">
          {selectedBattlecard ? (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  {editing ? (
                    <input
                      type="text"
                      value={editData.title || ''}
                      onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                      className="text-xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none"
                    />
                  ) : (
                    <h2 className="text-xl font-bold text-gray-900">{selectedBattlecard.title}</h2>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedBattlecard.competitorName}
                  </p>
                </div>
                <div className="flex space-x-2">
                  {!editing ? (
                    <>
                      <button
                        onClick={handleStartEdit}
                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={handleExport}
                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                      >
                        Export PDF
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleSaveEdit}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Summary</h3>
                {editing ? (
                  <textarea
                    value={editData.summary || ''}
                    onChange={(e) => setEditData({ ...editData, summary: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-700">{selectedBattlecard.summary}</p>
                )}
              </div>

              {/* Strengths */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Strengths
                </h3>
                {editing ? (
                  <textarea
                    value={(editData.strengths || []).join('\n')}
                    onChange={(e) =>
                      setEditData({ ...editData, strengths: e.target.value.split('\n').filter(s => s.trim()) })
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter strengths, one per line"
                  />
                ) : (
                  <ul className="space-y-2">
                    {selectedBattlecard.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start space-x-2 text-gray-700">
                        <span className="text-green-500 mt-1">•</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Weaknesses */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <span className="text-red-500 mr-2">✗</span>
                  Weaknesses
                </h3>
                {editing ? (
                  <textarea
                    value={(editData.weaknesses || []).join('\n')}
                    onChange={(e) =>
                      setEditData({ ...editData, weaknesses: e.target.value.split('\n').filter(w => w.trim()) })
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter weaknesses, one per line"
                  />
                ) : (
                  <ul className="space-y-2">
                    {selectedBattlecard.weaknesses.map((weakness, index) => (
                      <li key={index} className="flex items-start space-x-2 text-gray-700">
                        <span className="text-red-500 mt-1">•</span>
                        <span>{weakness}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Pricing */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Pricing Comparison</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Competitor</p>
                      <p className="font-medium text-gray-900">
                        {selectedBattlecard.pricing?.competitor || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Our Pricing</p>
                      <p className="font-medium text-gray-900">
                        {selectedBattlecard.pricing?.ours || 'N/A'}
                      </p>
                    </div>
                  </div>
                  {selectedBattlecard.pricing?.analysis && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-600">{selectedBattlecard.pricing.analysis}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Features */}
              {selectedBattlecard.features && selectedBattlecard.features.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Feature Comparison</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Feature
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                            Them
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                            Us
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Notes
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedBattlecard.features.map((feature, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">{feature.feature}</td>
                            <td className="px-4 py-2 text-center">
                              {feature.competitor ? (
                                <span className="text-green-500">✓</span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {feature.ours ? (
                                <span className="text-green-500">✓</span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">{feature.notes || ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Win Strategies */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <span className="text-blue-500 mr-2">🎯</span>
                  Win Strategies
                </h3>
                {editing ? (
                  <textarea
                    value={(editData.winStrategies || []).join('\n')}
                    onChange={(e) =>
                      setEditData({ ...editData, winStrategies: e.target.value.split('\n').filter(s => s.trim()) })
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter win strategies, one per line"
                  />
                ) : (
                  <ul className="space-y-2">
                    {selectedBattlecard.winStrategies.map((strategy, index) => (
                      <li key={index} className="flex items-start space-x-2 text-gray-700">
                        <span className="text-blue-500 mt-1">→</span>
                        <span>{strategy}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Metadata */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-400">
                  Created: {new Date(selectedBattlecard.createdAt).toLocaleDateString()}
                  {' • '}
                  Updated: {new Date(selectedBattlecard.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center min-h-[400px]">
              <div className="text-center text-gray-500">
                <p className="text-lg mb-2">No battlecard selected</p>
                <p className="text-sm">Select a battlecard from the list or generate a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Generate Dialog */}
      {showGenerateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Battlecard</h3>

            <div className="mb-4">
              <label htmlFor="generate-competitor" className="block text-sm font-medium text-gray-700 mb-2">
                Select Competitor
              </label>
              <select
                id="generate-competitor"
                value={selectedCompetitorId}
                onChange={(e) => setSelectedCompetitorId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a competitor...</option>
                {competitors.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowGenerateDialog(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating || !selectedCompetitorId}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6">
            <div className="text-gray-900">Loading...</div>
          </div>
        </div>
      )}
    </div>
  )
}
