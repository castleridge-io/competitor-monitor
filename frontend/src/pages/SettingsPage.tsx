import { useState, useEffect } from 'react'
import type { AlertSettings } from '../types'

const DEFAULT_SETTINGS: AlertSettings = {
  emailNotifications: false,
  emailAddress: '',
  telegramNotifications: false,
  telegramChatId: '',
  notificationFrequency: 'immediate',
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function SettingsPage() {
  const [settings, setSettings] = useState<AlertSettings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('apiKey') ?? '')

  useEffect(() => {
    const stored = localStorage.getItem('alertSettings')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setSettings({ ...DEFAULT_SETTINGS, ...parsed })
      } catch {
        // Ignore parse errors
      }
    }
  }, [])

  const handleSave = () => {
    setError(null)

    // Validate email if notifications enabled
    if (settings.emailNotifications && settings.emailAddress && !isValidEmail(settings.emailAddress)) {
      setError('Invalid email format')
      return
    }

    localStorage.setItem('alertSettings', JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleApiKeySave = () => {
    localStorage.setItem('apiKey', apiKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Configure alert settings and preferences</p>
      </div>

      {/* API Key Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">API Key</h2>
        <p className="text-sm text-gray-600 mb-4">
          Enter your API key to authenticate with the backend.
        </p>
        <div className="flex gap-3">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your API key"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
          />
          <button
            onClick={handleApiKeySave}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Save Key
          </button>
        </div>
      </div>

      {/* Email Notifications */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Notifications</h2>
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="email-notifications"
              checked={settings.emailNotifications}
              onChange={(e) =>
                setSettings({ ...settings, emailNotifications: e.target.checked })
              }
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label
              htmlFor="email-notifications"
              className="ml-2 block text-sm text-gray-900"
            >
              Enable Email Notifications
            </label>
          </div>

          {settings.emailNotifications && (
            <div>
              <label
                htmlFor="email-address"
                className="block text-sm font-medium text-gray-700"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email-address"
                value={settings.emailAddress}
                onChange={(e) =>
                  setSettings({ ...settings, emailAddress: e.target.value })
                }
                placeholder="your@email.com"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
              />
            </div>
          )}
        </div>
      </div>

      {/* Telegram Notifications */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Telegram Notifications</h2>
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="telegram-notifications"
              checked={settings.telegramNotifications}
              onChange={(e) =>
                setSettings({ ...settings, telegramNotifications: e.target.checked })
              }
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label
              htmlFor="telegram-notifications"
              className="ml-2 block text-sm text-gray-900"
            >
              Enable Telegram Notifications
            </label>
          </div>

          {settings.telegramNotifications && (
            <div>
              <label
                htmlFor="telegram-chat-id"
                className="block text-sm font-medium text-gray-700"
              >
                Telegram Chat ID
              </label>
              <input
                type="text"
                id="telegram-chat-id"
                value={settings.telegramChatId}
                onChange={(e) =>
                  setSettings({ ...settings, telegramChatId: e.target.value })
                }
                placeholder="Your Telegram Chat ID"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
              />
            </div>
          )}
        </div>
      </div>

      {/* Notification Frequency */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Frequency</h2>
        <div>
          <label
            htmlFor="frequency"
            className="block text-sm font-medium text-gray-700"
          >
            Notification Frequency
          </label>
          <select
            id="frequency"
            value={settings.notificationFrequency}
            onChange={(e) =>
              setSettings({
                ...settings,
                notificationFrequency: e.target.value as AlertSettings['notificationFrequency'],
              })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
          >
            <option value="immediate">Immediate</option>
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-700">Settings saved successfully!</p>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="w-full md:w-auto px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
      >
        Save Settings
      </button>
    </div>
  )
}