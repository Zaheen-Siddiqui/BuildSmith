import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ScanPage from './pages/scan/ScanPage'
import SettingsPage from './pages/SettingsPage'
import BundlePreviewPage from './pages/scan/BundlePreviewPage'
import SetupPage from './pages/SetupPage'
import InstallerFlowPage from './pages/InstallerFlowPage'
import DockerImagesPage from './pages/scan/DockerImagesPage'
import VSCodeProfilesPage from './pages/scan/VSCodeProfilesPage'
import DatabaseConnectionsPage from './pages/scan/DatabaseConnectionsPage'
import DevToolsPage from './pages/scan/DevToolsPage'
import EnvironmentPage from './pages/scan/EnvironmentPage'
import PackagesPage from './pages/scan/PackagesPage'
import ImportPage from './pages/setup/ImportPage'
import SetupConfigPage from './pages/setup/SetupConfigPage'
import SetupVSCodePage from './pages/setup/SetupVSCodePage'
import SetupDockerPage from './pages/setup/SetupDockerPage'
import SetupDatabasesPage from './pages/setup/SetupDatabasesPage'
import SetupPreviewPage from './pages/setup/SetupPreviewPage'
import SetupProgressPage from './pages/setup/SetupProgressPage'
import SetupCompletePage from './pages/setup/SetupCompletePage'
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
          <Route path="/setup-vscode" element={<SetupVSCodePage />} />
          <Route path="/setup-docker" element={<SetupDockerPage />} />
          <Route path="/setup-databases" element={<SetupDatabasesPage />} />
          <Route path="/setup-preview" element={<SetupPreviewPage />} />
          <Route path="/setup-progress" element={<SetupProgressPage />} />
          <Route path="/setup-complete" element={<SetupCompletePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/docker-images" element={<DockerImagesPage />} />
          <Route path="/vscode-profiles" element={<VSCodeProfilesPage />} />
          <Route path="/database-connections" element={<DatabaseConnectionsPage />} />
          <Route path="/devtools" element={<DevToolsPage />} />
          <Route path="/environment" element={<EnvironmentPage />} />
          <Route path="/packages" element={<PackagesPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/recent-bundles" element={<RecentBundlesPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
