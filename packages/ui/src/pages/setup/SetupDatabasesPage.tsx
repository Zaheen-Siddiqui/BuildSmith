import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Database } from 'lucide-react'
import { useBundleStore } from '../../store/bundleStore'

interface DatabaseData {
  id: string
  name: string
  type: 'postgresql' | 'mysql' | 'mongodb' | 'redis' | 'sqlserver'
  host?: string
  port?: number
  selected: boolean
}

export default function SetupDatabasesPage() {
  const navigate = useNavigate()
  const { 
    importedBundle, 
    manifestItems, 
    setupSelections, 
    setSetupSelections,
    selectedSetupDatabases,
    setSelectedSetupDatabases,
  } = useBundleStore()
  const [databases, setDatabases] = useState<DatabaseData[]>([])

  useEffect(() => {
    if (!importedBundle) {
      navigate('/import')
      return
    }

    // Extract database connections from manifest
    const dbConnections = manifestItems
      .filter(item => item.type === 'secret')
      .map((item, index) => {
        const dbId = `db-${index}`
        // Parse database type from item source or name
        let dbType: DatabaseData['type'] = 'postgresql'
        const itemSource = item.source?.toLowerCase() || ''
        if (itemSource.includes('mysql')) dbType = 'mysql'
        else if (itemSource.includes('mongo')) dbType = 'mongodb'
        else if (itemSource.includes('redis')) dbType = 'redis'
        else if (itemSource.includes('sqlserver') || itemSource.includes('mssql')) dbType = 'sqlserver'
        
        return {
          id: dbId,
          name: item.name,
          type: dbType,
          selected: selectedSetupDatabases.includes(item.name) || setupSelections.databases,
        }
      })

    setDatabases(dbConnections)
  }, [importedBundle, manifestItems, setupSelections.databases, selectedSetupDatabases, navigate])

  const handleToggleDatabase = (id: string) => {
    setDatabases(prev => 
      prev.map(db => 
        db.id === id ? { ...db, selected: !db.selected } : db
      )
    )
  }

  const handleSelectAll = () => {
    setDatabases(prev => prev.map(db => ({ ...db, selected: true })))
  }

  const handleDeselectAll = () => {
    setDatabases(prev => prev.map(db => ({ ...db, selected: false })))
  }

  const handleContinue = () => {
    // Save selected database names to store
    const selectedDbNames = databases.filter(db => db.selected).map(db => db.name)
    setSelectedSetupDatabases(selectedDbNames)
    
    const selectedCount = selectedDbNames.length
    
    if (selectedCount === 0) {
      // If no databases selected, disable databases in setup selections
      setSetupSelections({ ...setupSelections, databases: false })
    }

    // Navigate to preview (databases is the last selector)
    navigate('/setup-preview')
  }

  if (!importedBundle) return null

  const selectedCount = databases.filter(db => db.selected).length
  const allSelected = databases.length > 0 && databases.every(db => db.selected)

  const getDbIcon = (type: DatabaseData['type']) => {
    return <Database className="w-5 h-5 text-accent-400" />
  }

  const getDbColor = (type: DatabaseData['type']) => {
    const colors = {
      postgresql: 'text-blue-400',
      mysql: 'text-orange-400',
      mongodb: 'text-green-400',
      redis: 'text-red-400',
      sqlserver: 'text-purple-400',
    }
    return colors[type] || 'text-accent-400'
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => {
              // Navigate back based on what's enabled
              if (setupSelections.docker && manifestItems.some(item => item.type === 'image')) {
                navigate('/setup-docker')
              } else if (setupSelections.vscode && manifestItems.some(item => item.type === 'extension')) {
                navigate('/setup-vscode')
              } else {
                navigate('/setup-config')
              }
            }}
            className="flex items-center text-primary-300 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          <h1 className="text-4xl font-bold mb-2">Database Connections</h1>
          <p className="text-primary-200">
            Select which database connections to import from bundle: <span className="text-accent-400">{importedBundle.name}</span>
          </p>
        </div>

        {/* Info Banner */}
        <div className="card p-6 mb-6 border-2 border-blue-600/50 bg-blue-900/10">
          <div className="flex items-start gap-3">
            <Database className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-400 mb-2">Database Connection Import</h3>
              <ul className="space-y-1 text-sm text-primary-200">
                <li>• Connection credentials will be securely imported</li>
                <li>• Verify network access to remote database servers</li>
                <li>• Connection strings will be added to your environment</li>
                <li>• Encrypted credentials will be decrypted during import</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Databases List */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">
              Available Database Connections ({databases.length})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="btn-secondary text-sm"
                disabled={allSelected || databases.length === 0}
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                className="btn-secondary text-sm"
                disabled={selectedCount === 0}
              >
                Deselect All
              </button>
            </div>
          </div>

          {databases.length === 0 ? (
            <div className="text-center py-12 text-primary-300">
              <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No database connections found in this bundle</p>
            </div>
          ) : (
            <div className="space-y-3">
              {databases.map((db) => (
                <div
                  key={db.id}
                  onClick={() => handleToggleDatabase(db.id)}
                  className={`
                    p-4 rounded-lg border-2 transition-all cursor-pointer
                    ${db.selected 
                      ? 'bg-accent-900/20 border-accent-600' 
                      : 'bg-white/5 border-transparent hover:border-primary-600'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <input
                        type="checkbox"
                        checked={db.selected}
                        onChange={() => handleToggleDatabase(db.id)}
                        className="w-5 h-5 rounded border-primary-600 bg-primary-800 text-accent-600 focus:ring-2 focus:ring-accent-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {getDbIcon(db.type)}
                          <span className="font-medium">{db.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${getDbColor(db.type)} bg-white/10`}>
                            {db.type.toUpperCase()}
                          </span>
                        </div>
                        {db.host && (
                          <p className="text-sm text-primary-300 mt-1">
                            Host: {db.host}{db.port ? `:${db.port}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={handleContinue}
            className="btn-accent flex-1"
            disabled={selectedCount === 0}
          >
            {selectedCount === 0 ? 'No Connections Selected' : `Continue with ${selectedCount} Connection${selectedCount !== 1 ? 's' : ''}`}
          </button>
          <button
            onClick={() => {
              if (setupSelections.docker && manifestItems.some(item => item.type === 'image')) {
                navigate('/setup-docker')
              } else if (setupSelections.vscode && manifestItems.some(item => item.type === 'extension')) {
                navigate('/setup-vscode')
              } else {
                navigate('/setup-config')
              }
            }}
            className="btn-secondary"
          >
            Back
          </button>
        </div>

        {/* Skip Option */}
        {selectedCount === 0 && (
          <div className="text-center mt-4">
            <button
              onClick={handleContinue}
              className="text-primary-400 hover:text-white transition-colors text-sm"
            >
              Skip database setup and continue →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
