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
  type: 'installer' | 'package' | 'extension' | 'image' | 'profile' | 'secret' | 'database'
  source?: string
  checksum?: string
  included: boolean
}

export interface DockerImage {
  id: string
  name: string
  tag: string
  size: string  // e.g., "142 MB" or "1.2 GB"
  selected: boolean
}

export interface VSCodeProfile {
  id: string
  name: string
  extensions: string[]
  settings: Record<string, unknown>
  selected: boolean
}

export interface DatabaseConnection {
  id: string
  name: string
  type: 'postgresql' | 'mysql' | 'mongodb' | 'redis' | 'sqlserver'
  host: string
  port: number
  database: string
  selected: boolean
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
  
  // Selected items for scan
  selectedDockerImages: DockerImage[]
  setSelectedDockerImages: (images: DockerImage[]) => void
  toggleDockerImage: (id: string) => void
  
  selectedVSCodeProfiles: VSCodeProfile[]
  setSelectedVSCodeProfiles: (profiles: VSCodeProfile[]) => void
  toggleVSCodeProfile: (id: string) => void
  
  selectedDatabases: DatabaseConnection[]
  setSelectedDatabases: (databases: DatabaseConnection[]) => void
  toggleDatabase: (id: string) => void
  
  // Scan progress tracking
  scanProgress: {
    docker: boolean  // true if Docker images page completed
    vscode: boolean  // true if VS Code profiles page completed
    database: boolean  // true if Database connections page completed
  }
  setScanProgress: (progress: Partial<BundleState['scanProgress']>) => void
  
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

      // Selected items
      selectedDockerImages: [],
      setSelectedDockerImages: (images) => set({ selectedDockerImages: images }),
      toggleDockerImage: (id) =>
        set((state) => ({
          selectedDockerImages: state.selectedDockerImages.map((img) =>
            img.id === id ? { ...img, selected: !img.selected } : img
          ),
        })),

      selectedVSCodeProfiles: [],
      setSelectedVSCodeProfiles: (profiles) => set({ selectedVSCodeProfiles: profiles }),
      toggleVSCodeProfile: (id) =>
        set((state) => ({
          selectedVSCodeProfiles: state.selectedVSCodeProfiles.map((profile) =>
            profile.id === id ? { ...profile, selected: !profile.selected } : profile
          ),
        })),

      selectedDatabases: [],
      setSelectedDatabases: (databases) => set({ selectedDatabases: databases }),
      toggleDatabase: (id) =>
        set((state) => ({
          selectedDatabases: state.selectedDatabases.map((db) =>
            db.id === id ? { ...db, selected: !db.selected } : db
          ),
        })),

      // Scan progress
      scanProgress: {
        docker: false,
        vscode: false,
        database: false,
      },
      setScanProgress: (progress) =>
        set((state) => ({
          scanProgress: { ...state.scanProgress, ...progress },
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
          selectedDockerImages: [],
          selectedVSCodeProfiles: [],
          selectedDatabases: [],
          scanProgress: {
            docker: false,
            vscode: false,
            database: false,
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
