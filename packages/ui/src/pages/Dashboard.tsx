import { useNavigate } from 'react-router-dom'
import { Scan, Settings, Package, FileText } from 'lucide-react'

export default function Dashboard() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary-300 to-accent-400 bg-clip-text text-transparent">
            BuildSmith
          </h1>
          <p className="text-xl text-primary-200">
            Automated Development Environment Replication
          </p>
        </header>

        {/* Main Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Scan Card */}
          <button
            onClick={() => navigate('/scan')}
            className="card p-8 hover:bg-white/15 transition-all duration-200 hover:scale-105 text-left group"
          >
            <div className="flex items-start space-x-4">
              <div className="bg-primary-600 p-4 rounded-lg group-hover:bg-primary-500 transition-colors">
                <Scan className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Scan Environment</h2>
                <p className="text-primary-200">
                  Scan your current system and create a portable bundle of all your development tools and configurations.
                </p>
              </div>
            </div>
          </button>

          {/* Setup Card */}
          <button
            onClick={() => navigate('/import')}
            className="card p-8 hover:bg-white/15 transition-all duration-200 hover:scale-105 text-left group"
          >
            <div className="flex items-start space-x-4">
              <div className="bg-accent-600 p-4 rounded-lg group-hover:bg-accent-500 transition-colors">
                <Package className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Import Bundle</h2>
                <p className="text-primary-200">
                  Import a bundle and automatically set up your development environment on this device.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => navigate('/recent-bundles')}
            className="card p-6 hover:bg-white/15 transition-all duration-200 text-left"
          >
            <FileText className="w-6 h-6 mb-3 text-accent-400" />
            <h3 className="text-lg font-semibold mb-1">Recent Bundles</h3>
            <p className="text-sm text-primary-300">View and manage your export bundles</p>
          </button>

          <button
            onClick={() => navigate('/settings')}
            className="card p-6 hover:bg-white/15 transition-all duration-200 text-left"
          >
            <Settings className="w-6 h-6 mb-3 text-accent-400" />
            <h3 className="text-lg font-semibold mb-1">Settings</h3>
            <p className="text-sm text-primary-300">Configure app preferences</p>
          </button>

          <button
            onClick={() => navigate('/help')}
            className="card p-6 hover:bg-white/15 transition-all duration-200 text-left"
          >
            <FileText className="w-6 h-6 mb-3 text-accent-400" />
            <h3 className="text-lg font-semibold mb-1">Help</h3>
            <p className="text-sm text-primary-300">Documentation and support</p>
          </button>
        </div>

        {/* Activity Log Section */}
        <div className="card p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center">
            <span className="w-2 h-2 bg-accent-500 rounded-full mr-3 animate-pulse"></span>
            Recent Activity
          </h3>
          <div className="space-y-3">
            <div className="text-primary-300 text-sm">
              No recent activity. Start by scanning your environment or importing a bundle.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
