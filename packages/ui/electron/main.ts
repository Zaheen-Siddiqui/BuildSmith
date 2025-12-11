import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { spawn, ChildProcess } from 'node:child_process'

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null
let backendProcess: ChildProcess | null = null

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#1e3a8a', // Primary blue
    titleBarStyle: 'default',
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(process.env.DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow()
  setupIPCHandlers()
})

/**
 * Setup IPC handlers for communication with frontend
 */
function setupIPCHandlers() {
  // Handle backend commands
  ipcMain.handle('backend:command', async (event, command) => {
    console.log('Received command:', command.cmd)
    
    try {
      // Start backend process if not running
      if (!backendProcess) {
        startBackendProcess()
      }

      // Send command to backend via stdin
      if (backendProcess && backendProcess.stdin) {
        backendProcess.stdin.write(JSON.stringify(command) + '\n')
        return { success: true }
      } else {
        throw new Error('Backend process not available')
      }
    } catch (error: any) {
      console.error('Error handling command:', error)
      return { success: false, error: error.message }
    }
  })

  // Handle abort command
  ipcMain.handle('backend:abort', async () => {
    console.log('Abort requested')
    if (backendProcess && backendProcess.stdin) {
      backendProcess.stdin.write(JSON.stringify({ cmd: 'abort' }) + '\n')
    }
    return { success: true }
  })
}

/**
 * Start the PowerShell backend process
 */
function startBackendProcess() {
  if (backendProcess) {
    console.log('Backend process already running')
    return
  }

  // Path to backend runner script
  const backendPath = app.isPackaged
    ? path.join(process.resourcesPath, 'backend', 'runner.ps1')
    : path.join(__dirname, '../../backend/runner.ps1')

  console.log('Starting backend process:', backendPath)

  // Determine which PowerShell to use
  // Try pwsh first (PowerShell 7+), fallback to powershell.exe (Windows PowerShell 5.1)
  const isWindows = process.platform === 'win32'
  const powershellCommand = isWindows ? 'powershell.exe' : 'pwsh'

  // Spawn PowerShell process
  // Using 3>&1 redirects Warning stream to stdout where we can filter it out
  backendProcess = spawn(powershellCommand, [
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File',
    backendPath
  ], {
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  console.log(`Backend process started with PID: ${backendProcess.pid} using ${powershellCommand}`)

  // Handle stdout (JSON events from backend)
  if (backendProcess.stdout) {
    let buffer = ''
    backendProcess.stdout.on('data', (data: Buffer) => {
      buffer += data.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      lines.forEach(line => {
        if (line.trim()) {
          try {
            const event = JSON.parse(line)
            // Forward event to renderer
            if (win && win.webContents) {
              win.webContents.send('backend:event', event)
            }
          } catch (error) {
            console.error('Error parsing backend event:', line, error)
          }
        }
      })
    })
  }

  // Handle stderr (errors from backend)
  if (backendProcess.stderr) {
    backendProcess.stderr.on('data', (data: Buffer) => {
      console.error('Backend stderr:', data.toString())
      // Forward stderr as error log event
      if (win && win.webContents) {
        win.webContents.send('backend:event', {
          type: 'log',
          stepId: 'backend',
          level: 'error',
          text: data.toString(),
          timestamp: new Date().toISOString()
        })
      }
    })
  }

  // Handle process exit
  backendProcess.on('exit', (code, signal) => {
    console.log(`Backend process exited with code ${code}, signal ${signal}`)
    backendProcess = null
  })

  // Handle process errors
  backendProcess.on('error', (error) => {
    console.error('Backend process error:', error)
    if (win && win.webContents) {
      win.webContents.send('backend:event', {
        type: 'log',
        stepId: 'backend',
        level: 'error',
        text: `Backend error: ${error.message}`,
        timestamp: new Date().toISOString()
      })
    }
    backendProcess = null
  })
}

/**
 * Stop the backend process
 */
function stopBackendProcess() {
  if (backendProcess) {
    console.log('Stopping backend process')
    backendProcess.kill()
    backendProcess = null
  }
}

// Cleanup on app quit
app.on('before-quit', () => {
  stopBackendProcess()
})
