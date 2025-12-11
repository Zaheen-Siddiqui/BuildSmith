import { contextBridge, ipcRenderer } from 'electron'
import { IPCCommand, IPCEvent } from '../src/types/ipc'

/**
 * Electron API exposed to renderer process
 */
const electronAPI = {
  /**
   * Send a command to the backend
   */
  sendCommand: (command: IPCCommand): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('backend:command', command)
  },

  /**
   * Subscribe to backend events
   */
  onBackendEvent: (callback: (event: IPCEvent) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: IPCEvent) => callback(data)
    ipcRenderer.on('backend:event', handler)
    
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('backend:event', handler)
    }
  },

  /**
   * Abort current operation
   */
  abort: (): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('backend:abort')
  },

  /**
   * Select a bundle file using native dialog
   */
  selectBundle: (): Promise<{ success: boolean; filePath?: string; fileName?: string }> => {
    return ipcRenderer.invoke('dialog:selectBundle')
  },

  /**
   * Development: Check if running in dev mode
   */
  isDev: (): boolean => {
    return process.env.NODE_ENV === 'development'
  }
}

// Expose API to window object
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Export type for TypeScript
export type ElectronAPI = typeof electronAPI
