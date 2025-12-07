import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ScanSettings {
  vscode: boolean
  docker: boolean
  databases: boolean
  devtools: boolean
  environment: boolean
  packages: boolean
  includeSecrets: boolean
  encryptionPassphrase: string
  confirmPassphrase: string
}

export interface ManifestItem {
  name: string
  version: string
  type: 'installer' | 'package' | 'extension' | 'image' | 'profile' | 'secret'
  source?: string
  checksum?: string
  included: boolean
}

export interface BundleMetadata {
  id: string
  name: string
  createdAt: string
  description: string
  encrypted: boolean
}

export interface BundleState {
  // Scan settings
  scanSettings: ScanSettings
  setScanSettings: (settings: Partial<ScanSettings>) => void
  
  // Bundle metadata
  currentBundle: BundleMetadata | null
  setCurrentBundle: (bundle: BundleMetadata | null) => void
  
  // Manifest items
  manifestItems: ManifestItem[]
  setManifestItems: (items: ManifestItem[]) => void
  updateManifestItem: (index: number, updates: Partial<ManifestItem>) => void
  addManifestItem: (item: ManifestItem) => void
  removeManifestItem: (index: number) => void
  
  // Bundle export path
  exportPath: string
  setExportPath: (path: string) => void
  
  // Import bundle state
  importedBundle: BundleMetadata | null
  setImportedBundle: (bundle: BundleMetadata | null) => void
  
  // Setup selections
  setupSelections: {
    vscode: boolean
    docker: boolean
    databases: boolean
    devtools: boolean
    environment: boolean
    packages: boolean
  }
  setSetupSelections: (selections: Partial<BundleState['setupSelections']>) => void
  
  // Actions
  resetScan: () => void
  resetBundle: () => void
}

export const useBundleStore = create<BundleState>()(
  persist(
    (set) => ({
      // Initial scan settings
      scanSettings: {
        vscode: false,
        docker: false,
        databases: false,
        devtools: false,
        environment: false,
        packages: false,
        includeSecrets: false,
        encryptionPassphrase: '',
        confirmPassphrase: '',
      },
      setScanSettings: (settings) =>
        set((state) => ({
          scanSettings: { ...state.scanSettings, ...settings },
        })),

      // Bundle metadata
      currentBundle: null,
      setCurrentBundle: (bundle) => set({ currentBundle: bundle }),

      // Manifest items
      manifestItems: [],
      setManifestItems: (items) => set({ manifestItems: items }),
      updateManifestItem: (index, updates) =>
        set((state) => ({
          manifestItems: state.manifestItems.map((item, i) =>
            i === index ? { ...item, ...updates } : item
          ),
        })),
      addManifestItem: (item) =>
        set((state) => ({
          manifestItems: [...state.manifestItems, item],
        })),
      removeManifestItem: (index) =>
        set((state) => ({
          manifestItems: state.manifestItems.filter((_, i) => i !== index),
        })),

      // Export path
      exportPath: '',
      setExportPath: (path) => set({ exportPath: path }),

      // Import bundle
      importedBundle: null,
      setImportedBundle: (bundle) => set({ importedBundle: bundle }),

      // Setup selections
      setupSelections: {
        vscode: false,
        docker: false,
        databases: false,
        devtools: false,
        environment: false,
        packages: false,
      },
      setSetupSelections: (selections) =>
        set((state) => ({
          setupSelections: { ...state.setupSelections, ...selections },
        })),

      // Actions
      resetScan: () =>
        set({
          scanSettings: {
            vscode: false,
            docker: false,
            databases: false,
            devtools: false,
            environment: false,
            packages: false,
            includeSecrets: false,
            encryptionPassphrase: '',
            confirmPassphrase: '',
          },
        }),
      resetBundle: () =>
        set({
          currentBundle: null,
          manifestItems: [],
          exportPath: '',
        }),
    }),
    {
      name: 'buildsmith-bundle-storage',
      partialize: (state) => ({
        exportPath: state.exportPath,
        setupSelections: state.setupSelections,
      }),
    }
  )
)
