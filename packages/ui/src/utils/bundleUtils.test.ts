import { describe, it, expect } from 'vitest'
import { createBundle, parseBundle, encryptData, decryptData } from './bundleUtils'
import { ManifestItem, BundleMetadata, ScanSettings } from '../store/bundleStore'
import JSZip from 'jszip'

describe('bundleUtils', () => {
  describe('createBundle', () => {
    it('should create a bundle with metadata', async () => {
      const metadata: BundleMetadata = {
        id: 'test-123',
        name: 'Test Bundle',
        createdAt: '2024-01-01T00:00:00Z',
        description: 'Test Description',
        encrypted: false,
      }

      const manifestItems: ManifestItem[] = [
        {
          name: 'Git',
          version: '2.42.0',
          type: 'installer',
          included: true,
        },
      ]

      const scanSettings: ScanSettings = {
        vscode: false,
        docker: false,
        databases: false,
        devtools: false,
        environment: false,
        packages: false,
        includeSecrets: false,
        encryptionPassphrase: '',
        confirmPassphrase: '',
      }

      const blob = await createBundle({
        metadata,
        manifestItems,
        scanSettings,
      })

      expect(blob).toBeInstanceOf(Blob)
      expect(blob.size).toBeGreaterThan(0)

      // Verify ZIP contents
      const zip = await JSZip.loadAsync(blob)
      const bundleJson = await zip.file('bundle.json')?.async('string')
      
      expect(bundleJson).toBeDefined()
      const bundleData = JSON.parse(bundleJson!)
      expect(bundleData.name).toBe('Test Bundle')
      expect(bundleData.id).toBe('test-123')
    })

    it('should include VS Code profiles when enabled', async () => {
      const metadata: BundleMetadata = {
        id: 'test-vscode',
        name: 'VS Code Bundle',
        createdAt: '2024-01-01T00:00:00Z',
        description: 'Bundle with VS Code',
        encrypted: false,
      }

      const manifestItems: ManifestItem[] = [
        {
          name: 'ESLint',
          version: '2.4.2',
          type: 'extension',
          included: true,
        },
        {
          name: 'Prettier',
          version: '10.1.0',
          type: 'extension',
          included: true,
        },
      ]

      const scanSettings: ScanSettings = {
        vscode: true,
        docker: false,
        databases: false,
        devtools: false,
        environment: false,
        packages: false,
        includeSecrets: false,
        encryptionPassphrase: '',
        confirmPassphrase: '',
      }

      const blob = await createBundle({
        metadata,
        manifestItems,
        scanSettings,
      })

      const zip = await JSZip.loadAsync(blob)
      const profileJson = await zip.file('profiles/vscode_profile.json')?.async('string')
      
      expect(profileJson).toBeDefined()
      const profile = JSON.parse(profileJson!)
      expect(profile.extensions).toHaveLength(2)
      expect(profile.extensions[0].id).toBe('ESLint')
    })

    it('should include Docker images when enabled', async () => {
      const metadata: BundleMetadata = {
        id: 'test-docker',
        name: 'Docker Bundle',
        createdAt: '2024-01-01T00:00:00Z',
        description: 'Bundle with Docker',
        encrypted: false,
      }

      const manifestItems: ManifestItem[] = [
        {
          name: 'postgres',
          version: 'latest',
          type: 'image',
          included: true,
        },
      ]

      const scanSettings: ScanSettings = {
        vscode: false,
        docker: true,
        databases: false,
        devtools: false,
        environment: false,
        packages: false,
        includeSecrets: false,
        encryptionPassphrase: '',
        confirmPassphrase: '',
      }

      const blob = await createBundle({
        metadata,
        manifestItems,
        scanSettings,
      })

      const zip = await JSZip.loadAsync(blob)
      const imageTar = await zip.file('images/postgres.tar')?.async('string')
      
      expect(imageTar).toBeDefined()
      expect(imageTar).toContain('postgres:latest')
    })

    it('should only include items marked as included', async () => {
      const metadata: BundleMetadata = {
        id: 'test-filter',
        name: 'Filtered Bundle',
        createdAt: '2024-01-01T00:00:00Z',
        description: 'Bundle with filtering',
        encrypted: false,
      }

      const manifestItems: ManifestItem[] = [
        {
          name: 'Git',
          version: '2.42.0',
          type: 'installer',
          included: true,
        },
        {
          name: 'Node.js',
          version: '18.0.0',
          type: 'installer',
          included: false,
        },
      ]

      const scanSettings: ScanSettings = {
        vscode: false,
        docker: false,
        databases: false,
        devtools: false,
        environment: false,
        packages: false,
        includeSecrets: false,
        encryptionPassphrase: '',
        confirmPassphrase: '',
      }

      const blob = await createBundle({
        metadata,
        manifestItems,
        scanSettings,
      })

      const zip = await JSZip.loadAsync(blob)
      const manifestJson = await zip.file('manifests.json')?.async('string')
      
      expect(manifestJson).toBeDefined()
      const manifest = JSON.parse(manifestJson!)
      expect(manifest.items).toHaveLength(1)
      expect(manifest.items[0].name).toBe('Git')
    })

    it('should handle encrypted bundles', async () => {
      const metadata: BundleMetadata = {
        id: 'test-encrypted',
        name: 'Encrypted Bundle',
        createdAt: '2024-01-01T00:00:00Z',
        description: 'Encrypted bundle',
        encrypted: true,
      }

      const manifestItems: ManifestItem[] = [
        {
          name: '.env',
          version: '1.0',
          type: 'secret',
          included: true,
        },
      ]

      const scanSettings: ScanSettings = {
        vscode: false,
        docker: false,
        databases: false,
        devtools: false,
        environment: false,
        packages: false,
        includeSecrets: true,
        encryptionPassphrase: 'test-pass',
        confirmPassphrase: 'test-pass',
      }

      const blob = await createBundle({
        metadata,
        manifestItems,
        scanSettings,
      })

      const zip = await JSZip.loadAsync(blob)
      const secretFile = await zip.file('secrets/.env.gpg')?.async('string')
      
      expect(secretFile).toBeDefined()
      expect(secretFile).toContain('Encrypted secret')
    })
  })

  describe('parseBundle', () => {
    it('should parse bundle metadata from ZIP file', async () => {
      const zip = new JSZip()
      
      const bundleData = {
        id: '789',
        name: 'Parse Test',
        createdAt: '2024-01-01T00:00:00Z',
        description: 'Test description',
        encrypted: false,
      }
      
      const manifestData = {
        items: [
          { name: 'Git', version: '2.42.0', type: 'installer', included: true },
        ],
        totalItems: 1,
      }
      
      zip.file('bundle.json', JSON.stringify(bundleData))
      zip.file('manifests.json', JSON.stringify(manifestData))
      
      const blob = await zip.generateAsync({ type: 'blob' })
      const file = new File([blob], 'test.buildsmith.zip')
      
      const result = await parseBundle(file)
      
      expect(result.metadata.name).toBe('Parse Test')
      expect(result.metadata.id).toBe('789')
    })

    it('should throw error for missing bundle.json', async () => {
      const zip = new JSZip()
      zip.file('manifests.json', '{}')
      
      const blob = await zip.generateAsync({ type: 'blob' })
      const file = new File([blob], 'test.buildsmith.zip')
      
      await expect(parseBundle(file)).rejects.toThrow('missing bundle.json')
    })

    it('should throw error for missing manifests.json', async () => {
      const zip = new JSZip()
      zip.file('bundle.json', '{}')
      
      const blob = await zip.generateAsync({ type: 'blob' })
      const file = new File([blob], 'test.buildsmith.zip')
      
      await expect(parseBundle(file)).rejects.toThrow('missing manifests.json')
    })

    it('should throw error for invalid JSON', async () => {
      const zip = new JSZip()
      zip.file('bundle.json', 'invalid json {')
      zip.file('manifests.json', '{}')
      
      const blob = await zip.generateAsync({ type: 'blob' })
      const file = new File([blob], 'test.buildsmith.zip')
      
      await expect(parseBundle(file)).rejects.toThrow()
    })
  })

  describe('encryptData and decryptData', () => {
    it('should encrypt and decrypt data correctly', () => {
      const originalData = 'secret-api-key-12345'
      const passphrase = 'my-secure-password'
      
      const encrypted = encryptData(originalData, passphrase)
      
      expect(encrypted).toContain('BEGIN PGP MESSAGE')
      expect(encrypted).not.toContain(originalData)
      
      const decrypted = decryptData(encrypted, passphrase)
      expect(decrypted).toBe(originalData)
    })

    it('should fail decryption with wrong passphrase', () => {
      const originalData = 'secret-data'
      const passphrase = 'correct-password'
      
      const encrypted = encryptData(originalData, passphrase)
      
      expect(() => decryptData(encrypted, 'wrong-password')).toThrow('Invalid passphrase')
    })

    it('should fail decryption with invalid data', () => {
      expect(() => decryptData('invalid-encrypted-data', 'password')).toThrow('Decryption failed')
    })
  })
})
