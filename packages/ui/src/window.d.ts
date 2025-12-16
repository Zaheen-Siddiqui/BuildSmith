/**
 * Global type definitions for Electron API exposed via preload script
 */

import { IPCCommand, IPCEvent } from './types/ipc'

export interface ElectronAPI {
  /**
   * Send a command to the backend
   */
  sendCommand: (command: IPCCommand) => Promise<{ success: boolean; error?: string }>

  /**
   * Subscribe to backend events
   */
  onBackendEvent: (callback: (event: IPCEvent) => void) => () => void

  /**
   * Abort current operation
   */
  abort: () => Promise<{ success: boolean }>

  /**
   * Select a bundle file using native dialog
   */
  selectBundle: () => Promise<{ success: boolean; filePath?: string; fileName?: string }>

  /**
   * Read a bundle file and return its contents as ArrayBuffer
   */
  readBundle: (filePath: string) => Promise<{ success: boolean; data?: ArrayBuffer; error?: string }>

  /**
   * Check if running in development mode
   */
  isDev: () => boolean
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
