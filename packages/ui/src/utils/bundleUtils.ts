import JSZip from 'jszip'
import { ManifestItem, BundleMetadata, ScanSettings, VSCodeProfile } from '../store/bundleStore'

export interface BundleExportOptions {
  metadata: BundleMetadata
  manifestItems: ManifestItem[]
  scanSettings: ScanSettings
  selectedVSCodeProfiles?: VSCodeProfile[]  // Add selected profiles
  outputPath?: string
}

/**
 * Generate a complete bundle ZIP file with all necessary components
 */
export async function createBundle(options: BundleExportOptions): Promise<Blob> {
  const zip = new JSZip()
  
  // 1. Create bundle metadata
  const bundleInfo = {
    id: options.metadata.id,
    name: options.metadata.name,
    version: '1.0.0',
    createdAt: options.metadata.createdAt,
    description: options.metadata.description,
    encrypted: options.metadata.encrypted,
    buildsmithVersion: '0.1.0',
  }
  
  zip.file('bundle.json', JSON.stringify(bundleInfo, null, 2))
  
  // 2. Create manifest with all items
  const manifest = {
    items: options.manifestItems.filter(item => item.included),
    totalItems: options.manifestItems.filter(item => item.included).length,
    categories: {
      installers: options.manifestItems.filter(item => item.type === 'installer' && item.included).length,
      packages: options.manifestItems.filter(item => item.type === 'package' && item.included).length,
      extensions: options.manifestItems.filter(item => item.type === 'extension' && item.included).length,
      images: options.manifestItems.filter(item => item.type === 'image' && item.included).length,
      profiles: options.manifestItems.filter(item => item.type === 'profile' && item.included).length,
      secrets: options.manifestItems.filter(item => item.type === 'secret' && item.included).length,
    }
  }
  
  zip.file('manifests.json', JSON.stringify(manifest, null, 2))
  
  // 3. Create VS Code profiles folder with individual profile files
  if (options.scanSettings.vscode && options.selectedVSCodeProfiles && options.selectedVSCodeProfiles.length > 0) {
    const profilesFolder = zip.folder('profiles')
    
    // Create individual profile files for each selected profile
    options.selectedVSCodeProfiles
      .filter(profile => profile.selected)
      .forEach(profile => {
        // Sanitize profile name for filename
        const safeName = profile.name.replace(/[^\w-]/g, '_')
        const profileFileName = `${safeName}-profile.json`
        
        // Create VS Code native export format
        const profileData = {
          name: profile.name,
          extensions: profile.extensions.map(extId => ({
            identifier: { id: extId },
            version: '1.0.0'  // We don't have actual versions in the store
          })),
          settings: profile.settings || {}
        }
        
        profilesFolder?.file(profileFileName, JSON.stringify(profileData, null, 2))
      })
  }
  
  // 4. Create Docker images folder with placeholder tars
  if (options.scanSettings.docker) {
    const dockerFolder = zip.folder('images')
    const dockerImages = options.manifestItems.filter(item => item.type === 'image' && item.included)
    
    for (const image of dockerImages) {
      // Create a placeholder tar file (in real implementation, this would be actual image data)
      const placeholderContent = `# Docker Image: ${image.name}:${image.version}\n# This is a placeholder for the actual image tar file\n`
      dockerFolder?.file(`${image.name.replace('/', '_')}.tar`, placeholderContent)
    }
  }
  
  // 5. Create installers folder with metadata
  const installers = options.manifestItems.filter(item => item.type === 'installer' && item.included)
  if (installers.length > 0) {
    const installersFolder = zip.folder('installers')
    
    for (const installer of installers) {
      // Create installer metadata file
      const installerMeta = {
        name: installer.name,
        version: installer.version,
        source: installer.source,
        checksum: installer.checksum,
        platform: 'windows',
        silent: true,
      }
      
      installersFolder?.file(`${installer.name}_metadata.json`, JSON.stringify(installerMeta, null, 2))
    }
  }
  
  // 6. Create secrets folder if encryption is enabled
  // Note: Individual files are encrypted (mock .gpg format), but the ZIP itself is not password-protected
  // In production, you could use zip.generateAsync({ type: 'blob', encryption: true, password: passphrase })
  if (options.scanSettings.includeSecrets && options.metadata.encrypted) {
    const secretsFolder = zip.folder('secrets')
    const secrets = options.manifestItems.filter(item => item.type === 'secret' && item.included)
    
    for (const secret of secrets) {
      // In real implementation, these would be encrypted files using the passphrase
      const secretContent = `# Encrypted secret: ${secret.name}\n# Encryption: AES-256\n# This is a mock encrypted file\n`
      secretsFolder?.file(`${secret.name}.gpg`, secretContent)
    }
  }
  
  // 7. Create environment variables file
  if (options.scanSettings.environment) {
    const envVars = {
      PATH: 'C:\\BuildSmith\\bin;C:\\Program Files\\Git\\cmd',
      NODE_ENV: 'development',
      DOCKER_HOST: 'tcp://localhost:2375',
    }
    
    zip.file('environment.json', JSON.stringify(envVars, null, 2))
  }
  
  // 8. Create packages file (npm, pip, etc.)
  if (options.scanSettings.packages) {
    const packages = options.manifestItems.filter(item => item.type === 'package' && item.included)
    const packagesByType: Record<string, string[]> = {
      npm: [],
      pip: [],
      cargo: [],
    }
    
    for (const pkg of packages) {
      if (pkg.name.includes('npm:')) {
        packagesByType.npm.push(`${pkg.name.replace('npm:', '')}@${pkg.version}`)
      } else if (pkg.name.includes('pip:')) {
        packagesByType.pip.push(`${pkg.name.replace('pip:', '')}==${pkg.version}`)
      }
    }
    
    zip.file('packages.json', JSON.stringify(packagesByType, null, 2))
  }
  
  // 9. Create databases folder if included
  if (options.scanSettings.databases) {
    const dbFolder = zip.folder('databases')
    const dbConnections = {
      connections: [
        {
          name: 'MongoDB Local',
          type: 'mongodb',
          uri: 'mongodb://localhost:27017',
          encrypted: options.metadata.encrypted,
        },
        {
          name: 'PostgreSQL Dev',
          type: 'postgres',
          uri: 'postgresql://localhost:5432/devdb',
          encrypted: options.metadata.encrypted,
        },
      ],
    }
    
    dbFolder?.file('connections.json', JSON.stringify(dbConnections, null, 2))
  }
  
  // Generate the ZIP blob
  const blob = await zip.generateAsync({ type: 'blob' })
  return blob
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Parse a bundle ZIP file and extract metadata
 */
export async function parseBundle(file: File): Promise<{
  metadata: BundleMetadata
  manifest: { items: ManifestItem[] }
}> {
  const zip = new JSZip()
  const contents = await zip.loadAsync(file)
  
  // Read bundle metadata
  const bundleJsonFile = contents.file('bundle.json')
  if (!bundleJsonFile) {
    throw new Error('Invalid bundle: missing bundle.json')
  }
  
  const bundleJson = await bundleJsonFile.async('string')
  const bundleInfo = JSON.parse(bundleJson)
  
  const metadata: BundleMetadata = {
    id: bundleInfo.id,
    name: bundleInfo.name,
    createdAt: bundleInfo.createdAt,
    description: bundleInfo.description || '',
    encrypted: bundleInfo.encrypted || false,
  }
  
  // Read manifest
  const manifestFile = contents.file('manifests.json')
  if (!manifestFile) {
    throw new Error('Invalid bundle: missing manifests.json')
  }
  
  const manifestJson = await manifestFile.async('string')
  const manifest = JSON.parse(manifestJson)
  
  return { metadata, manifest }
}

/**
 * Simulate encryption of sensitive data (mock for now)
 */
export function encryptData(data: string, passphrase: string): string {
  // This is a mock implementation
  // In real implementation, use crypto library like crypto-js or node's crypto
  const encrypted = btoa(data + '::' + passphrase)
  return `-----BEGIN PGP MESSAGE-----\n${encrypted}\n-----END PGP MESSAGE-----`
}

/**
 * Simulate decryption of sensitive data (mock for now)
 */
export function decryptData(encryptedData: string, passphrase: string): string {
  // This is a mock implementation
  try {
    const base64 = encryptedData
      .replace('-----BEGIN PGP MESSAGE-----\n', '')
      .replace('\n-----END PGP MESSAGE-----', '')
      .trim()
    
    const decrypted = atob(base64)
    const [data, pass] = decrypted.split('::')
    
    if (pass !== passphrase) {
      throw new Error('Invalid passphrase')
    }
    
    return data
  } catch (error) {
    throw new Error('Decryption failed: ' + (error as Error).message)
  }
}
