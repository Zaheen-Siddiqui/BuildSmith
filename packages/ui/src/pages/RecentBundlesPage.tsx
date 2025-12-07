import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Package, Calendar, HardDrive, Download, Trash2, FileText, Play } from 'lucide-react'

export default function RecentBundlesPage() {
  const navigate = useNavigate()

  const [bundles] = useState([
    {
      id: '1',
      name: 'Full-Stack Dev Setup',
      created: '2024-01-15T14:30:00',
      size: '2.4 GB',
      path: 'C:\\Users\\siddi\\Documents\\Bundles\\fullstack-2024-01-15.bsb',
      components: {
        vscode: true,
        docker: true,
        databases: true,
        devtools: true,
        environment: true,
        packages: true
      },
      itemsCount: 47,
      encrypted: true
    },
    {
      id: '2',
      name: 'Node.js Backend Only',
      created: '2024-01-10T09:15:00',
      size: '890 MB',
      path: 'C:\\Users\\siddi\\Documents\\Bundles\\nodejs-backend-2024-01-10.bsb',
      components: {
        vscode: true,
        docker: false,
        databases: true,
        devtools: true,
        environment: true,
        packages: true
      },
      itemsCount: 23,
      encrypted: false
    },
    {
      id: '3',
      name: 'Docker + K8s Setup',
      created: '2024-01-05T16:45:00',
      size: '3.1 GB',
      path: 'C:\\Users\\siddi\\Documents\\Bundles\\docker-k8s-2024-01-05.bsb',
      components: {
        vscode: true,
        docker: true,
        databases: false,
        devtools: true,
        environment: false,
        packages: false
      },
      itemsCount: 12,
      encrypted: true
    }
  ])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const handleLoadBundle = (bundlePath: string) => {
    // In a real app, this would load the bundle
    navigate('/setup', { state: { bundlePath } })
  }

  const handleDeleteBundle = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      // In a real app, this would delete the bundle file
      console.log('Deleting bundle:', id)
    }
  }

  const getComponentBadges = (components: any) => {
    const badges = []
    if (components.vscode) badges.push('VS Code')
    if (components.docker) badges.push('Docker')
    if (components.databases) badges.push('Databases')
    if (components.devtools) badges.push('DevTools')
    if (components.environment) badges.push('Environment')
    if (components.packages) badges.push('Packages')
    return badges
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-primary-300 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold mb-2">Recent Bundles</h1>
          <p className="text-primary-200">
            View and manage your previously created environment bundles
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-primary-300">Total Bundles</div>
                <div className="text-3xl font-bold mt-1">{bundles.length}</div>
              </div>
              <Package className="w-8 h-8 text-accent-400" />
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-primary-300">Total Size</div>
                <div className="text-3xl font-bold mt-1">6.4 GB</div>
              </div>
              <HardDrive className="w-8 h-8 text-accent-400" />
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-primary-300">Encrypted</div>
                <div className="text-3xl font-bold mt-1">
                  {bundles.filter(b => b.encrypted).length}
                </div>
              </div>
              <FileText className="w-8 h-8 text-accent-400" />
            </div>
          </div>
        </div>

        {/* Bundle List */}
        <div className="space-y-4">
          {bundles.length === 0 ? (
            <div className="card p-12 text-center">
              <Package className="w-16 h-16 text-primary-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No bundles yet</h3>
              <p className="text-primary-300 mb-6">
                Create your first environment bundle from the Scan page
              </p>
              <button
                onClick={() => navigate('/scan')}
                className="btn-primary"
              >
                Start Scanning
              </button>
            </div>
          ) : (
            bundles.map(bundle => (
              <div key={bundle.id} className="card p-6 hover:bg-white/10 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Package className="w-6 h-6 text-accent-400" />
                      <h3 className="text-xl font-semibold">{bundle.name}</h3>
                      {bundle.encrypted && (
                        <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 text-xs rounded">
                          Encrypted
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-primary-300">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(bundle.created)}
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-4 h-4" />
                        {bundle.size}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {bundle.itemsCount} items
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLoadBundle(bundle.path)}
                      className="btn-primary flex items-center gap-2"
                      title="Load this bundle for setup"
                    >
                      <Play className="w-4 h-4" />
                      Load Bundle
                    </button>
                    <button
                      onClick={() => handleDeleteBundle(bundle.id, bundle.name)}
                      className="btn-secondary flex items-center gap-2 hover:bg-red-900/30 hover:text-red-400"
                      title="Delete this bundle"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Component Badges */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {getComponentBadges(bundle.components).map(component => (
                    <span
                      key={component}
                      className="px-3 py-1 bg-accent-900/30 text-accent-400 text-xs rounded-full"
                    >
                      {component}
                    </span>
                  ))}
                </div>

                {/* File Path */}
                <div className="bg-black/20 rounded p-2 text-xs font-mono text-primary-300 flex items-center justify-between">
                  <span className="truncate">{bundle.path}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(bundle.path)}
                    className="ml-2 px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-xs transition-colors flex-shrink-0"
                  >
                    Copy Path
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => navigate('/scan')}
            className="btn-accent flex items-center gap-2"
          >
            <Package className="w-4 h-4" />
            Create New Bundle
          </button>
          <button
            onClick={() => {
              // In a real app, this would open a file dialog
              alert('Open file dialog to import an existing bundle')
            }}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Import Bundle
          </button>
        </div>
      </div>
    </div>
  )
}
