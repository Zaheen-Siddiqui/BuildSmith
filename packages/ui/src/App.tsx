import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ScanPage from './pages/ScanPage'
import SettingsPage from './pages/SettingsPage'
import BundlePreviewPage from './pages/BundlePreviewPage'
import SetupPage from './pages/SetupPage'
import InstallerFlowPage from './pages/InstallerFlowPage'
import DockerImagesPage from './pages/DockerImagesPage'
import VSCodeProfilesPage from './pages/VSCodeProfilesPage'
import DatabaseConnectionsPage from './pages/DatabaseConnectionsPage'
import ImportPage from './pages/ImportPage'
import SetupConfigPage from './pages/SetupConfigPage'
import SetupPreviewPage from './pages/SetupPreviewPage'
import SetupProgressPage from './pages/SetupProgressPage'
import SetupCompletePage from './pages/SetupCompletePage'
import HelpPage from './pages/HelpPage'
import RecentBundlesPage from './pages/RecentBundlesPage'
import './index.css'

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/bundle-preview" element={<BundlePreviewPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/installer" element={<InstallerFlowPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/setup-config" element={<SetupConfigPage />} />
          <Route path="/setup-preview" element={<SetupPreviewPage />} />
          <Route path="/setup-progress" element={<SetupProgressPage />} />
          <Route path="/setup-complete" element={<SetupCompletePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/docker-images" element={<DockerImagesPage />} />
          <Route path="/vscode-profiles" element={<VSCodeProfilesPage />} />
          <Route path="/database-connections" element={<DatabaseConnectionsPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/recent-bundles" element={<RecentBundlesPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
