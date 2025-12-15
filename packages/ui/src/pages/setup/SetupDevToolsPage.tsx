import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Terminal, Download, CheckCircle } from 'lucide-react'
import { useBundleStore } from '../../store/bundleStore'

interface DevToolItem {
  id: string
  name: string
  version: string
  command: string
  selected: boolean
  available: boolean // Already installed locally
}

export default function SetupDevToolsPage() {
  const navigate = useNavigate()
  const { 
    importedBundle, 
    manifestItems, 
    setupSelections, 
    setSetupSelections,
  } = useBundleStore()
  const [tools, setTools] = useState<DevToolItem[]>([])

  useEffect(() => {
    if (!importedBundle) {
      navigate('/import')
      return
    }

    // Extract DevOps tools from manifest
    const devTools = manifestItems
      .filter(item => item.type === 'installer')
      .map((item, index) => ({
        id: `devtool-${index}`,
        name: item.name,
        version: item.version || 'latest',
        command: item.source || item.name.toLowerCase(),
        selected: setupSelections.devtools,
        available: false, // TODO: Check if tool already exists in PATH
      }))

    setTools(devTools)
  }, [importedBundle, manifestItems, setupSelections.devtools, navigate])

  const handleToggleTool = (id: string) => {
    setTools(prev => 
      prev.map(tool => 
        tool.id === id ? { ...tool, selected: !tool.selected } : tool
      )
    )
  }

  const handleSelectAll = () => {
    setTools(prev => prev.map(tool => ({ ...tool, selected: true })))
  }

  const handleDeselectAll = () => {
    setTools(prev => prev.map(tool => ({ ...tool, selected: false })))
  }

  const handleContinue = () => {
    const selectedCount = tools.filter(tool => tool.selected).length
    
    if (selectedCount === 0) {
      // If no tools selected, disable devtools in setup selections
      setSetupSelections({ ...setupSelections, devtools: false })
    }

    // Navigate to next page based on setup selections
    // Order: vscode -> docker -> databases -> devtools -> environment -> packages -> preview
    if (setupSelections.environment && manifestItems.some(item => item.name.startsWith('ENV:') || item.name.startsWith('PATH:'))) {
      navigate('/setup-environment')
    } else if (setupSelections.packages && manifestItems.some(item => item.type === 'package')) {
      navigate('/setup-packages')
    } else {
      navigate('/setup-preview')
    }
  }

  if (!importedBundle) return null

  const selectedCount = tools.filter(tool => tool.selected).length
  const availableCount = tools.filter(tool => tool.available).length

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/setup-config')}
            className="flex items-center text-primary-300 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Configuration
          </button>
          <h1 className="text-4xl font-bold mb-2">DevOps Tools</h1>
          <p className="text-primary-200">
            Select which DevOps CLI tools to install from bundle: <span className="text-accent-400">{importedBundle.name}</span>
          </p>
        </div>

        {/* Info Banner */}
        <div className="card p-6 mb-6 border-2 border-blue-600/50 bg-blue-900/10">
          <div className="flex items-start gap-3">
            <Terminal className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-400 mb-2">Tool Installation Options</h3>
              <ul className="space-y-1 text-sm text-primary-200">
                <li>• Tools will be installed to standard system locations</li>
                <li>• Version specified in the bundle will be installed</li>
                <li>• Tools already available will be skipped</li>
                <li>• Administrative privileges may be required</li>
                <li>• Some tools may require manual installation</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-1">{tools.length} Tools Found</h3>
              <p className="text-primary-300 text-sm">
                {selectedCount} selected • {availableCount} already installed
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition text-sm"
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition text-sm"
              >
                Deselect All
              </button>
            </div>
          </div>
        </div>

        {/* Tools List */}
        {tools.length === 0 ? (
          <div className="card p-12 text-center">
            <Terminal className="w-16 h-16 mx-auto mb-4 text-gray-500" />
            <p className="text-xl text-gray-400">No DevOps tools in this bundle</p>
          </div>
        ) : (
          <div className="grid gap-4 mb-6">
            {tools.map((tool) => (
              <div
                key={tool.id}
                onClick={() => handleToggleTool(tool.id)}
                className={`
                  card p-6 cursor-pointer transition-all duration-200 border-2
                  ${tool.selected 
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-transparent hover:border-white/20'
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={tool.selected}
                    onChange={() => {}}
                    className="mt-1 w-5 h-5 rounded border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Terminal className="w-5 h-5 text-blue-400" />
                      <h3 className="text-xl font-semibold">{tool.name}</h3>
                      <span className="px-3 py-1 bg-blue-600/30 text-blue-300 rounded-full text-sm">
                        v{tool.version}
                      </span>
                      {tool.available && (
                        <span className="px-3 py-1 bg-green-600/30 text-green-300 rounded-full text-sm flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Already Installed
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-gray-400">
                      <p><span className="text-gray-500">Command:</span> {tool.command}</p>
                    </div>
                  </div>
                  <Download className={`w-5 h-5 ${tool.selected ? 'text-blue-400' : 'text-gray-600'}`} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleContinue}
            className="btn-accent flex-1"
            disabled={selectedCount === 0 && setupSelections.devtools}
          >
            {selectedCount === 0 ? 'Skip DevOps Tools' : `Continue with ${selectedCount} Tools`}
          </button>
          <button
            onClick={() => navigate('/setup-config')}
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
              Skip DevOps tools setup and continue →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
