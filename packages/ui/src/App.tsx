import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ScanPage from './pages/ScanPage'
import SettingsPage from './pages/SettingsPage'
import BundlePreviewPage from './pages/BundlePreviewPage'
import SetupPage from './pages/SetupPage'
import InstallerFlowPage from './pages/InstallerFlowPage'
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
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
