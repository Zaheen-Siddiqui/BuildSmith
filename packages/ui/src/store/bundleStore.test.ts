import { describe, it, expect, beforeEach } from 'vitest'
import { useBundleStore } from '../store/bundleStore'

describe('BundleStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useBundleStore.getState()
    store.resetScan()
    store.resetBundle()
  })

  describe('Scan Settings', () => {
    it('should initialize with default scan settings', () => {
      const { scanSettings } = useBundleStore.getState()
      
      expect(scanSettings).toEqual({
        vscode: false,
        docker: false,
        databases: false,
        devtools: false,
        environment: false,
        packages: false,
        includeSecrets: false,
        encryptionPassphrase: '',
        confirmPassphrase: '',
      })
    })

    it('should update scan settings', () => {
      const { setScanSettings, scanSettings } = useBundleStore.getState()
      
      setScanSettings({ vscode: true, docker: true })
      
      const updated = useBundleStore.getState().scanSettings
      expect(updated.vscode).toBe(true)
      expect(updated.docker).toBe(true)
      expect(updated.databases).toBe(false)
    })
  })

  describe('Docker Images', () => {
    it('should toggle docker image selection', () => {
      const { setSelectedDockerImages, toggleDockerImage } = useBundleStore.getState()
      
      const mockImages = [
        { id: '1', name: 'postgres', tag: 'latest', size: '100MB', selected: false },
        { id: '2', name: 'nginx', tag: 'alpine', size: '50MB', selected: false },
      ]
      
      setSelectedDockerImages(mockImages)
      toggleDockerImage('1')
      
      const { selectedDockerImages } = useBundleStore.getState()
      expect(selectedDockerImages[0].selected).toBe(true)
      expect(selectedDockerImages[1].selected).toBe(false)
    })
  })

  describe('VS Code Profiles', () => {
    it('should toggle VS Code profile selection', () => {
      const { setSelectedVSCodeProfiles, toggleVSCodeProfile } = useBundleStore.getState()
      
      const mockProfiles = [
        { id: '1', name: 'Default', extensions: ['ESLint'], settings: {}, selected: false },
        { id: '2', name: 'Python Dev', extensions: ['Python'], settings: {}, selected: false },
      ]
      
      setSelectedVSCodeProfiles(mockProfiles)
      toggleVSCodeProfile('2')
      
      const { selectedVSCodeProfiles } = useBundleStore.getState()
      expect(selectedVSCodeProfiles[0].selected).toBe(false)
      expect(selectedVSCodeProfiles[1].selected).toBe(true)
    })
  })

  describe('Manifest Items', () => {
    it('should add manifest items', () => {
      const { addManifestItem, manifestItems } = useBundleStore.getState()
      
      const newItem = {
        name: 'Git',
        version: '2.42.0',
        type: 'installer' as const,
        source: 'https://git-scm.com',
        included: true,
      }
      
      addManifestItem(newItem)
      
      const updated = useBundleStore.getState().manifestItems
      expect(updated).toHaveLength(1)
      expect(updated[0].name).toBe('Git')
    })

    it('should update manifest item', () => {
      const { setManifestItems, updateManifestItem } = useBundleStore.getState()
      
      setManifestItems([
        { name: 'Git', version: '2.42.0', type: 'installer', included: true },
      ])
      
      updateManifestItem(0, { included: false })
      
      const { manifestItems } = useBundleStore.getState()
      expect(manifestItems[0].included).toBe(false)
    })

    it('should remove manifest item', () => {
      const { setManifestItems, removeManifestItem } = useBundleStore.getState()
      
      setManifestItems([
        { name: 'Git', version: '2.42.0', type: 'installer', included: true },
        { name: 'Node.js', version: '18.0.0', type: 'installer', included: true },
      ])
      
      removeManifestItem(0)
      
      const { manifestItems } = useBundleStore.getState()
      expect(manifestItems).toHaveLength(1)
      expect(manifestItems[0].name).toBe('Node.js')
    })
  })

  describe('Setup Selections', () => {
    it('should initialize with default setup selections', () => {
      const { setupSelections } = useBundleStore.getState()
      
      expect(setupSelections).toEqual({
        vscode: false,
        docker: false,
        databases: false,
        devtools: false,
        environment: false,
        packages: false,
      })
    })

    it('should update setup selections', () => {
      const { setSetupSelections } = useBundleStore.getState()
      
      setSetupSelections({ vscode: true, databases: true })
      
      const { setupSelections } = useBundleStore.getState()
      expect(setupSelections.vscode).toBe(true)
      expect(setupSelections.databases).toBe(true)
      expect(setupSelections.docker).toBe(false)
    })
  })

  describe('Setup Docker Images', () => {
    it('should set selected setup docker images', () => {
      const { setSelectedSetupDockerImages } = useBundleStore.getState()
      
      setSelectedSetupDockerImages(['docker-0', 'docker-2'])
      
      const { selectedSetupDockerImages } = useBundleStore.getState()
      expect(selectedSetupDockerImages).toEqual(['docker-0', 'docker-2'])
    })
  })

  describe('Setup VS Code Profiles', () => {
    it('should set selected setup VS Code profiles', () => {
      const { setSelectedSetupVSCodeProfiles } = useBundleStore.getState()
      
      setSelectedSetupVSCodeProfiles(['ESLint', 'Prettier'])
      
      const { selectedSetupVSCodeProfiles } = useBundleStore.getState()
      expect(selectedSetupVSCodeProfiles).toEqual(['ESLint', 'Prettier'])
    })
  })

  describe('Setup Databases', () => {
    it('should set selected setup databases', () => {
      const { setSelectedSetupDatabases } = useBundleStore.getState()
      
      setSelectedSetupDatabases(['PostgreSQL Main', 'MongoDB Dev'])
      
      const { selectedSetupDatabases } = useBundleStore.getState()
      expect(selectedSetupDatabases).toEqual(['PostgreSQL Main', 'MongoDB Dev'])
    })
  })

  describe('Reset Functions', () => {
    it('should reset scan state', () => {
      const { setScanSettings, setSelectedDockerImages, resetScan } = useBundleStore.getState()
      
      setScanSettings({ vscode: true, docker: true })
      setSelectedDockerImages([
        { id: '1', name: 'postgres', tag: 'latest', size: '100MB', selected: true },
      ])
      
      resetScan()
      
      const { scanSettings, selectedDockerImages } = useBundleStore.getState()
      expect(scanSettings.vscode).toBe(false)
      expect(selectedDockerImages).toEqual([])
    })

    it('should reset bundle state', () => {
      const { setManifestItems, setCurrentBundle, resetBundle } = useBundleStore.getState()
      
      setManifestItems([
        { name: 'Git', version: '2.42.0', type: 'installer', included: true },
      ])
      setCurrentBundle({
        id: '1',
        name: 'Test Bundle',
        createdAt: new Date().toISOString(),
        description: 'Test',
        encrypted: false,
      })
      
      resetBundle()
      
      const { manifestItems, currentBundle } = useBundleStore.getState()
      expect(manifestItems).toEqual([])
      expect(currentBundle).toBeNull()
    })
  })
})
