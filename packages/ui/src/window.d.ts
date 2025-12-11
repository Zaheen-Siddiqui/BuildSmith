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
