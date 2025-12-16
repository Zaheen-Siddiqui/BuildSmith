import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ScanSettings {
  vscode: boolean
  docker: boolean
  databases: boolean
  includeMongoData: boolean  // Include actual MongoDB database data
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
  username?: string  // For Atlas connections - extracted from Compass or user-provided
  password?: string  // For Atlas connections - user will provide during setup
  isAtlas?: boolean  // True if this is a MongoDB Atlas connection
}

export interface DevTool {
  id: string
  name: string
  command: string
  version: string
  path: string
  selected: boolean
}

export interface EnvironmentVariable {
  id: string
  name: string
  value: string
  scope: 'system' | 'user'
  selected: boolean
}

export interface PathEntry {
  id: string
  path: string
  scope: 'system' | 'user'
  exists: boolean
  selected: boolean
}

export interface Package {
  id: string
  name: string
  version: string
  manager: 'npm' | 'pip' | 'winget' | 'chocolatey'
  selected: boolean
}

export interface BundleMetadata {
  id: string
  name: string
  path?: string  // Full path to bundle file
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
  
  selectedDevTools: DevTool[]
  setSelectedDevTools: (tools: DevTool[]) => void
  toggleDevTool: (id: string) => void
  
  selectedEnvironmentVars: EnvironmentVariable[]
  setSelectedEnvironmentVars: (vars: EnvironmentVariable[]) => void
  toggleEnvironmentVar: (id: string) => void
  
  selectedPathEntries: PathEntry[]
  setSelectedPathEntries: (entries: PathEntry[]) => void
  togglePathEntry: (id: string) => void
  
  selectedPackages: Package[]
  setSelectedPackages: (packages: Package[]) => void
  togglePackage: (id: string) => void
  
  // Scan progress tracking
  scanProgress: {
    docker: boolean  // true if Docker images page completed
    vscode: boolean  // true if VS Code profiles page completed
    database: boolean  // true if Database connections page completed
    devtools: boolean  // true if DevOps tools page completed
    environment: boolean  // true if Environment variables page completed
    packages: boolean  // true if Packages page completed
  }
  setScanProgress: (progress: Partial<BundleState['scanProgress']>) => void
  
  // Scan completion tracking - tracks if scan has been run and results are cached
  scanCompleted: {
    docker: boolean
    vscode: boolean
    database: boolean
    devtools: boolean
    environment: boolean
    packages: boolean
  }
  setScanCompleted: (completed: Partial<BundleState['scanCompleted']>) => void
  
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
  
  // Selected docker images for setup (subset of manifest items)
  selectedSetupDockerImages: string[] // Array of image IDs that user selected
  setSelectedSetupDockerImages: (imageIds: string[]) => void
  
  // Selected VS Code profiles for setup (subset of manifest items)
  selectedSetupVSCodeProfiles: string[] // Array of profile/extension names that user selected
  setSelectedSetupVSCodeProfiles: (profileNames: string[]) => void
  
  // Selected databases for setup (subset of manifest items)
  selectedSetupDatabases: string[] // Array of database names that user selected
  setSelectedSetupDatabases: (dbNames: string[]) => void
  
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
        includeMongoData: false,
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

      selectedDevTools: [],
      setSelectedDevTools: (tools) => set({ selectedDevTools: tools }),
      toggleDevTool: (id) =>
        set((state) => ({
          selectedDevTools: state.selectedDevTools.map((tool) =>
            tool.id === id ? { ...tool, selected: !tool.selected } : tool
          ),
        })),

      selectedEnvironmentVars: [],
      setSelectedEnvironmentVars: (vars) => set({ selectedEnvironmentVars: vars }),
      toggleEnvironmentVar: (id) =>
        set((state) => ({
          selectedEnvironmentVars: state.selectedEnvironmentVars.map((v) =>
            v.id === id ? { ...v, selected: !v.selected } : v
          ),
        })),

      selectedPathEntries: [],
      setSelectedPathEntries: (entries) => set({ selectedPathEntries: entries }),
      togglePathEntry: (id) =>
        set((state) => ({
          selectedPathEntries: state.selectedPathEntries.map((entry) =>
            entry.id === id ? { ...entry, selected: !entry.selected } : entry
          ),
        })),

      selectedPackages: [],
      setSelectedPackages: (packages) => set({ selectedPackages: packages }),
      togglePackage: (id) =>
        set((state) => ({
          selectedPackages: state.selectedPackages.map((pkg) =>
            pkg.id === id ? { ...pkg, selected: !pkg.selected } : pkg
          ),
        })),

      // Scan progress
      scanProgress: {
        docker: false,
        vscode: false,
        database: false,
        devtools: false,
        environment: false,
        packages: false,
      },
      setScanProgress: (progress) =>
        set((state) => ({
          scanProgress: { ...state.scanProgress, ...progress },
        })),
      
      // Scan completion tracking
      scanCompleted: {
        docker: false,
        vscode: false,
        database: false,
        devtools: false,
        environment: false,
        packages: false,
      },
      setScanCompleted: (completed) =>
        set((state) => ({
          scanCompleted: { ...state.scanCompleted, ...completed },
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

      // Selected docker images for setup
      selectedSetupDockerImages: [],
      setSelectedSetupDockerImages: (imageIds) => set({ selectedSetupDockerImages: imageIds }),

      // Selected VS Code profiles for setup
      selectedSetupVSCodeProfiles: [],
      setSelectedSetupVSCodeProfiles: (profileNames) => set({ selectedSetupVSCodeProfiles: profileNames }),

      // Selected databases for setup
      selectedSetupDatabases: [],
      setSelectedSetupDatabases: (dbNames) => set({ selectedSetupDatabases: dbNames }),

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
            includeMongoData: false,
            encryptionPassphrase: '',
            confirmPassphrase: '',
          },
          selectedDockerImages: [],
          selectedVSCodeProfiles: [],
          selectedDatabases: [],
          selectedDevTools: [],
          selectedEnvironmentVars: [],
          selectedPathEntries: [],
          selectedPackages: [],
          scanProgress: {
            docker: false,
            vscode: false,
            database: false,
            devtools: false,
            environment: false,
            packages: false,
          },
          scanCompleted: {
            docker: false,
            vscode: false,
            database: false,
            devtools: false,
            environment: false,
            packages: false,
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
        scanSettings: state.scanSettings,
        selectedDockerImages: state.selectedDockerImages,
        selectedVSCodeProfiles: state.selectedVSCodeProfiles,
        selectedDatabases: state.selectedDatabases,
        selectedDevTools: state.selectedDevTools,
        selectedEnvironmentVars: state.selectedEnvironmentVars,
        selectedPathEntries: state.selectedPathEntries,
        selectedPackages: state.selectedPackages,
        scanProgress: state.scanProgress,
        scanCompleted: state.scanCompleted,
        currentBundle: state.currentBundle,
        manifestItems: state.manifestItems,
        exportPath: state.exportPath,
        setupSelections: state.setupSelections,
      }),
    }
  )
)
