import { useState } from 'react'
import { X, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { DatabaseConnection } from '../store/bundleStore'

interface AtlasPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  connection: DatabaseConnection | null
  onSubmit: (credentials: { username: string; password: string }) => void
}

export default function AtlasPasswordModal({
  isOpen,
  onClose,
  connection,
  onSubmit,
}: AtlasPasswordModalProps) {
  // Pre-fill username if connection has it, otherwise empty for user to enter
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  // Update username when connection changes
  if (isOpen && connection && username === '' && connection.username) {
    setUsername(connection.username)
  }

  if (!isOpen || !connection) return null

  // Use the host directly
  const extractHost = () => {
    return connection.host || 'cluster.mongodb.net'
  }

  const handleSubmit = () => {
    if (!username.trim()) {
      setError('Username is required')
      return
    }
    if (!password.trim()) {
      setError('Password is required')
      return
    }
    
    // Clear error and submit
    setError('')
    onSubmit({ username: username.trim(), password: password.trim() })
    setUsername('')
    setPassword('')
    onClose()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  const host = extractHost()

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="card max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-primary-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-accent-500/20 flex items-center justify-center">
            <Lock className="w-6 h-6 text-accent-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Atlas Connection Password</h2>
            <p className="text-sm text-primary-300">{connection.name}</p>
          </div>
        </div>

        {/* Connection Info */}
        <div className="mb-6 p-4 bg-primary-800/50 rounded-lg">
          <div className="text-sm space-y-2">
            <div>
              <span className="text-primary-400">Connection:</span>{' '}
              <span className="font-semibold text-accent-400">{connection.name}</span>
            </div>
            <div>
              <span className="text-primary-400">Host:</span>{' '}
              <span className="font-mono text-sm text-primary-300">{host}</span>
            </div>
          </div>
        </div>

        {/* Info message */}
        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200">
            <p className="font-semibold mb-1">Security Note</p>
            <p className="text-xs text-blue-300">
              MongoDB Compass doesn't store credentials. Please enter your Atlas username and password.
            </p>
          </div>
        </div>

        {/* Username Input */}
        <div className="mb-4">
          <label htmlFor="atlas-username" className="block text-sm font-medium mb-2">
            MongoDB Atlas Username
          </label>
          <input
            id="atlas-username"
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
              setError('')
            }}
            onKeyDown={handleKeyPress}
            placeholder="Enter your Atlas username"
            className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg focus:outline-none focus:border-accent-500 transition-colors text-white placeholder:text-gray-400"
            autoFocus={!username}
          />
        </div>

        {/* Password Input */}
        <div className="mb-6">
          <label htmlFor="atlas-password" className="block text-sm font-medium mb-2">
            MongoDB Atlas Password
          </label>
          <div className="relative">
            <input
              id="atlas-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              onKeyDown={handleKeyPress}
              placeholder="Enter your Atlas password"
              className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/30 rounded-lg focus:outline-none focus:border-accent-500 transition-colors text-white placeholder:text-gray-400"
              autoFocus={!!username}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}
        </div>

        {/* Connection String Preview */}
        <div className="mb-6 p-3 bg-primary-900/50 rounded-lg border border-primary-700">
          <div className="text-xs text-primary-400 mb-1">Connection string will be:</div>
          <div className="font-mono text-xs text-primary-200 break-all">
            mongodb+srv://{username || '•••'}:<span className="text-accent-400">••••••••</span>@{host}/...
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            className="btn-accent flex-1"
            disabled={!username.trim() || !password.trim()}
          >
            Connect
          </button>
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>

        {/* Help text */}
        <div className="mt-4 text-xs text-primary-400 text-center">
          Don't have your password? Check your MongoDB Atlas account or password manager
        </div>
      </div>
    </div>
  )
}
