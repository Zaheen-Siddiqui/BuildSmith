import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Database, Eye, EyeOff, Lock, Unlock, Download } from 'lucide-react'

interface DatabaseConnection {
  id: string
  name: string
  type: 'mongodb' | 'postgres' | 'mysql'
  host: string
  port: number
  database: string
  username: string
  encrypted: boolean
  hasBackup: boolean
}

export default function DatabaseConnectionsPage() {
  const navigate = useNavigate()
  const [showPassphrase, setShowPassphrase] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [decrypted, setDecrypted] = useState(false)
  const [selectedConnections, setSelectedConnections] = useState<Set<string>>(new Set(['1', '2']))

  const connections: DatabaseConnection[] = [
    {
      id: '1',
      name: 'Production MongoDB',
      type: 'mongodb',
      host: 'prod-mongo.example.com',
      port: 27017,
      database: 'main_db',
      username: 'admin',
      encrypted: true,
      hasBackup: true
    },
    {
      id: '2',
      name: 'Dev PostgreSQL',
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      database: 'dev_db',
      username: 'postgres',
      encrypted: true,
      hasBackup: false
    },
    {
      id: '3',
      name: 'MySQL Analytics',
      type: 'mysql',
      host: 'analytics.example.com',
      port: 3306,
      database: 'analytics',
      username: 'reader',
      encrypted: true,
      hasBackup: true
    }
  ]

  const toggleConnection = (id: string) => {
    const newSelected = new Set(selectedConnections)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedConnections(newSelected)
  }

  const handleDecrypt = () => {
    if (passphrase) {
      setDecrypted(true)
    }
  }

  const getTypeIcon = (type: string) => {
    return <Database className="w-5 h-5 text-accent-400" />
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'mongodb': return 'bg-green-900/30 text-green-400'
      case 'postgres': return 'bg-blue-900/30 text-blue-400'
      case 'mysql': return 'bg-orange-900/30 text-orange-400'
      default: return 'bg-primary-900/30 text-primary-400'
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/scan')}
            className="flex items-center text-primary-300 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Scan
          </button>
          <h1 className="text-4xl font-bold mb-2">Database Connections</h1>
          <p className="text-primary-200">
            Manage database connections and restore options
          </p>
        </div>

        {/* Decrypt Section */}
        {!decrypted && (
          <div className="card p-6 mb-6 border-2 border-accent-600/50">
            <div className="flex items-start gap-3">
              <Lock className="w-6 h-6 text-accent-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">Encrypted Connections</h3>
                <p className="text-primary-300 mb-4">
                  Database connections are encrypted. Enter the passphrase to view and manage them.
                </p>
                <div className="flex gap-3">
                  <div className="flex-1 relative max-w-md">
                    <input
                      type={showPassphrase ? "text" : "password"}
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder="Enter decryption passphrase"
                      className="w-full px-4 py-2 pr-12 bg-white/10 border border-white/30 rounded focus:outline-none focus:border-accent-500 transition-colors text-white placeholder:text-gray-400"
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setShowPassphrase(!showPassphrase)
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-300 hover:text-white transition-colors"
                    >
                      {showPassphrase ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <button onClick={handleDecrypt} className="btn-accent">
                    <Unlock className="w-4 h-4 mr-2 inline" />
                    Decrypt
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Connections List */}
        {decrypted && (
          <>
            <div className="card p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Saved Connections</h2>
                <span className="text-sm text-primary-300">
                  {selectedConnections.size} of {connections.length} selected
                </span>
              </div>

              <div className="space-y-4">
                {connections.map(conn => (
                  <div
                    key={conn.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedConnections.has(conn.id)
                        ? 'border-accent-600 bg-accent-900/10'
                        : 'border-white/20 bg-white/5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedConnections.has(conn.id)}
                        onChange={() => toggleConnection(conn.id)}
                        className="mt-1 w-5 h-5 accent-accent-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            {getTypeIcon(conn.type)}
                            <div>
                              <h3 className="font-semibold text-lg">{conn.name}</h3>
                              <span className={`text-xs px-2 py-1 rounded ${getTypeColor(conn.type)}`}>
                                {conn.type.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          {conn.hasBackup && (
                            <span className="flex items-center gap-1 text-xs text-accent-400">
                              <Download className="w-3 h-3" />
                              Backup Available
                            </span>
                          )}
                        </div>

                        <div className="bg-black/20 p-3 rounded mt-2 space-y-1 text-sm font-mono">
                          <div className="flex justify-between">
                            <span className="text-primary-400">Host:</span>
                            <span>{conn.host}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-primary-400">Port:</span>
                            <span>{conn.port}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-primary-400">Database:</span>
                            <span>{conn.database}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-primary-400">Username:</span>
                            <span>{conn.username}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-primary-400">Password:</span>
                            <span>••••••••</span>
                          </div>
                        </div>

                        {selectedConnections.has(conn.id) && conn.hasBackup && (
                          <div className="mt-3 space-y-2">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                defaultChecked
                                className="w-4 h-4 accent-accent-600"
                              />
                              <span>Restore connection settings</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                defaultChecked
                                className="w-4 h-4 accent-accent-600"
                              />
                              <span>Restore database backup ({conn.type === 'mongodb' ? 'mongorestore' : conn.type === 'postgres' ? 'pg_restore' : 'mysql restore'})</span>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Import Options */}
            <div className="card p-6 mb-6">
              <h3 className="text-xl font-bold mb-4">Import Options</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-5 h-5 accent-accent-600" />
                  <span>Import to MongoDB Compass (if installed)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-5 h-5 accent-accent-600" />
                  <span>Add to system environment variables</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 accent-accent-600" />
                  <span>Test connections after import</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/scan')}
                className="btn-accent flex-1"
              >
                Save Selection
              </button>
              <button
                onClick={() => navigate('/scan')}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
