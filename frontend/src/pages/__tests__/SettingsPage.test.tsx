import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SettingsPage } from '../SettingsPage'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>
  )
}

describe('SettingsPage', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  it('should display settings page header', () => {
    renderWithRouter()

    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText(/configure alert settings/i)).toBeInTheDocument()
  })

  it('should load existing settings from localStorage', () => {
    localStorageMock.setItem(
      'alertSettings',
      JSON.stringify({
        emailNotifications: true,
        emailAddress: 'test@example.com',
        telegramNotifications: false,
        telegramChatId: '',
        notificationFrequency: 'daily',
      })
    )

    renderWithRouter()

    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
  })

  it('should toggle email notifications', async () => {
    renderWithRouter()

    const emailToggle = screen.getByLabelText(/enable email notifications/i)
    expect(emailToggle).not.toBeChecked()

    await userEvent.click(emailToggle)

    expect(emailToggle).toBeChecked()
  })

  it('should show email input when email notifications enabled', async () => {
    renderWithRouter()

    const emailToggle = screen.getByLabelText(/enable email notifications/i)
    await userEvent.click(emailToggle)

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
  })

  it('should toggle telegram notifications', async () => {
    renderWithRouter()

    const telegramToggle = screen.getByLabelText(/enable telegram notifications/i)
    expect(telegramToggle).not.toBeChecked()

    await userEvent.click(telegramToggle)

    expect(telegramToggle).toBeChecked()
  })

  it('should show telegram chat id input when telegram notifications enabled', async () => {
    renderWithRouter()

    const telegramToggle = screen.getByLabelText(/enable telegram notifications/i)
    await userEvent.click(telegramToggle)

    expect(screen.getByLabelText(/telegram chat id/i)).toBeInTheDocument()
  })

  it('should change notification frequency', async () => {
    renderWithRouter()

    const frequencySelect = screen.getByLabelText(/notification frequency/i)
    expect(frequencySelect).toHaveValue('immediate')

    await userEvent.selectOptions(frequencySelect, 'daily')

    expect(frequencySelect).toHaveValue('daily')
  })

  it('should save settings to localStorage', async () => {
    renderWithRouter()

    const emailToggle = screen.getByLabelText(/enable email notifications/i)
    await userEvent.click(emailToggle)

    const emailInput = screen.getByLabelText(/email address/i)
    await userEvent.type(emailInput, 'test@example.com')

    const saveButton = screen.getByRole('button', { name: /save settings/i })
    await userEvent.click(saveButton)

    expect(localStorageMock.setItem).toHaveBeenCalled()
    const savedSettings = JSON.parse(
      localStorageMock.setItem.mock.calls.find((call) => call[0] === 'alertSettings')?.[1] ?? '{}'
    )
    expect(savedSettings.emailNotifications).toBe(true)
    expect(savedSettings.emailAddress).toBe('test@example.com')
  })

  it('should show success message after saving', async () => {
    renderWithRouter()

    const saveButton = screen.getByRole('button', { name: /save settings/i })
    await userEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/settings saved/i)).toBeInTheDocument()
    })
  })

  it('should validate email format', async () => {
    renderWithRouter()

    const emailToggle = screen.getByLabelText(/enable email notifications/i)
    await userEvent.click(emailToggle)

    const emailInput = screen.getByLabelText(/email address/i)
    await userEvent.type(emailInput, 'invalid-email')

    const saveButton = screen.getByRole('button', { name: /save settings/i })
    await userEvent.click(saveButton)

    expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
  })

  it('should display API key management section', () => {
    renderWithRouter()

    expect(screen.getByText(/api key/i)).toBeInTheDocument()
  })
})