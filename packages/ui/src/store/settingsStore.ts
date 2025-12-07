import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AppSettings {
  // General
  autoCheckUpdates: boolean
  updateChannel: 'stable' | 'beta' | 'dev'
  startMinimized: boolean
  
  // UI
  theme: 'dark' | 'light' | 'system'
  language: 'en' | 'es' | 'fr' | 'de'
  
  // Security
  defaultEncryption: 'aes256' | 'gpg' | 'age'
  requirePassphrase: boolean
  autoLock: boolean
  lockTimeout: number // minutes
  
  // Paths
  bundlesFolder: string
  installersFolder: string
  backupLocation: string
  
  // Advanced
  loggingLevel: 'error' | 'warn' | 'info' | 'debug'
  parallelDownloads: number
  enableTelemetry: boolean
  enableBetaFeatures: boolean
}

export interface SettingsState {
  settings: AppSettings
  updateSettings: (updates: Partial<AppSettings>) => void
  resetSettings: () => void
}

const defaultSettings: AppSettings = {
  autoCheckUpdates: true,
  updateChannel: 'stable',
  startMinimized: false,
  theme: 'dark',
  language: 'en',
  defaultEncryption: 'aes256',
  requirePassphrase: true,
  autoLock: false,
  lockTimeout: 15,
  bundlesFolder: 'C:\\BuildSmith\\bundles',
  installersFolder: 'C:\\BuildSmith\\installers',
  backupLocation: 'C:\\BuildSmith\\backups',
  loggingLevel: 'info',
  parallelDownloads: 3,
  enableTelemetry: false,
  enableBetaFeatures: false,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),
      resetSettings: () =>
        set({ settings: defaultSettings }),
    }),
    {
      name: 'buildsmith-settings-storage',
    }
  )
)
