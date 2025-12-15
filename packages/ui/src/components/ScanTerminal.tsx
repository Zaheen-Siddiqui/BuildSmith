import { useEffect, useRef } from 'react'
import { Terminal, X, Maximize2, Minimize2 } from 'lucide-react'

interface LogEntry {
  stepId: string
  level: string
  text: string
  timestamp: string
}

interface ScanTerminalProps {
  logs: LogEntry[]
  isOpen: boolean
  isMaximized: boolean
  onClose: () => void
  onToggleMaximize: () => void
  title?: string
}

export default function ScanTerminal({
  logs,
  isOpen,
  isMaximized,
  onClose,
  onToggleMaximize,
  title = 'Scan Output'
}: ScanTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logs])

  if (!isOpen) return null

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-400'
      case 'warn':
        return 'text-yellow-400'
      case 'success':
        return 'text-green-400'
      case 'info':
        return 'text-blue-400'
      case 'debug':
        return 'text-primary-400'
      default:
        return 'text-primary-300'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div
        className={`bg-primary-900 rounded-lg shadow-2xl flex flex-col ${
          isMaximized ? 'w-full h-full' : 'w-full max-w-5xl h-[80vh]'
        } transition-all duration-200`}
      >
        {/* Terminal Header */}
        <div className="bg-primary-800 px-6 py-4 flex items-center justify-between border-b border-white/10 rounded-t-lg">
          <div className="flex items-center gap-3">
            <Terminal className="w-6 h-6 text-accent-400" />
            <h2 className="text-xl font-bold">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMaximize}
              className="p-2 hover:bg-white/10 rounded transition-colors"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Terminal Content */}
        <div
          ref={terminalRef}
          className="flex-1 bg-black p-6 overflow-y-auto font-mono text-sm"
        >
          {logs.length === 0 ? (
            <div className="text-primary-400">Waiting for scan to start...</div>
          ) : (
            <div className="space-y-0.5">
              {logs.map((log, i) => (
                <div key={`${log.stepId}-${log.timestamp}-${i}`} className="flex gap-3 items-start">
                  <span className="text-primary-500 text-xs flex-shrink-0 w-20">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`text-xs flex-shrink-0 w-16 uppercase ${getLogLevelColor(log.level)}`}>
                    [{log.level}]
                  </span>
                  <span className="text-primary-100 flex-1 break-all">
                    {log.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Terminal Footer */}
        <div className="bg-primary-800 px-6 py-3 border-t border-white/10 rounded-b-lg flex items-center justify-between">
          <div className="text-sm text-primary-400">
            {logs.length} log {logs.length === 1 ? 'entry' : 'entries'}
          </div>
          <button
            onClick={() => {
              const logText = logs.map(log => 
                `[${new Date(log.timestamp).toLocaleTimeString()}] [${log.level.toUpperCase()}] ${log.text}`
              ).join('\n')
              navigator.clipboard.writeText(logText)
            }}
            className="text-sm text-accent-400 hover:text-accent-300 transition-colors"
          >
            Copy to Clipboard
          </button>
        </div>
      </div>
    </div>
  )
}
