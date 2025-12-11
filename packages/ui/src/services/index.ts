/**
 * Service Factory - Automatically selects between real IPC and mock IPC
 * based on whether the app is running in Electron or browser
 */

import { ipcService } from './ipc'
import { mockIPC } from './mockIPC'

/**
 * Get the appropriate IPC service based on environment
 * - In Electron: uses real IPC service
 * - In browser/dev: uses mock IPC service
 */
export function getIPCService() {
  // Check if running in Electron environment
  if (typeof window !== 'undefined' && window.electronAPI) {
    console.log('[ServiceFactory] Using real IPC service (Electron environment)')
    return ipcService
  } else {
    console.log('[ServiceFactory] Using mock IPC service (browser environment)')
    return mockIPC
  }
}

// Export singleton instance
export const ipc = getIPCService()
