import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Book, AlertCircle, CheckCircle, Info, ExternalLink } from 'lucide-react'

export default function HelpPage() {
  const navigate = useNavigate()

  const manualSteps = [
    {
      id: '1',
      title: 'Enable WSL2 for Docker Desktop',
      description: 'Docker Desktop requires Windows Subsystem for Linux 2 (WSL2) to be enabled',
      status: 'pending',
      steps: [
        'Open PowerShell as Administrator',
        'Run: wsl --install',
        'Restart your computer',
        'Verify WSL2 is enabled: wsl --status'
      ]
    },
    {
      id: '2',
      title: 'Sign in to Docker Hub',
      description: 'Manual sign-in required for Docker Hub to pull private images',
      status: 'requires_manual',
      steps: [
        'Open Docker Desktop',
        'Click "Sign In" in the top-right corner',
        'Enter your Docker Hub credentials',
        'Verify sign-in status'
      ]
    },
    {
      id: '3',
      title: 'Activate VS Code Extensions',
      description: 'Some extensions may require additional licenses or sign-in',
      status: 'pending',
      steps: [
        'Open VS Code',
        'Go to Extensions panel',
        'Sign in to GitHub Copilot (if applicable)',
        'Activate any premium extensions'
      ]
    }
  ]

  const faqs = [
    {
      question: 'How does BuildSmith handle sensitive data?',
      answer: 'All sensitive data (credentials, API keys, connection strings) are encrypted using GPG or age before being exported. You must provide a passphrase to decrypt them on the target device.'
    },
    {
      question: 'Can I use BuildSmith without internet?',
      answer: 'Yes! BuildSmith supports offline mode. You can include offline installers in your bundle and use local Docker image tar files.'
    },
    {
      question: 'What if an installation fails?',
      answer: 'BuildSmith allows you to retry failed installations, skip them, or pause the process. All logs are saved for troubleshooting.'
    },
    {
      question: 'How do I transfer the bundle to another device?',
      answer: 'Export the bundle to a USB drive, cloud storage, or network location. Then import it on the target device using the Setup page.'
    },
    {
      question: 'Will BuildSmith work on Linux or macOS?',
      answer: 'Currently, BuildSmith is Windows-first. Linux and macOS support is planned for future releases.'
    }
  ]

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
          <h1 className="text-4xl font-bold mb-2">Help & Documentation</h1>
          <p className="text-primary-200">
            Get help with BuildSmith and learn about manual activation steps
          </p>
        </div>

        {/* Manual Steps Checklist */}
        <div className="card p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-yellow-500" />
            Manual Activation Steps
          </h2>
          <p className="text-primary-300 mb-4">
            Some features cannot be automated and require manual intervention. Follow these steps after installation.
          </p>
          <div className="space-y-4">
            {manualSteps.map(step => (
              <div key={step.id} className="bg-white/5 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{step.title}</h3>
                    <p className="text-sm text-primary-300">{step.description}</p>
                  </div>
                  <span className={`px-3 py-1 rounded text-xs ${
                    step.status === 'requires_manual' 
                      ? 'bg-yellow-900/30 text-yellow-400'
                      : 'bg-primary-900/30 text-primary-400'
                  }`}>
                    {step.status === 'requires_manual' ? 'Required' : 'Optional'}
                  </span>
                </div>
                <div className="bg-black/20 rounded p-3">
                  <div className="text-sm font-semibold mb-2">Steps:</div>
                  <ol className="space-y-2 text-sm">
                    {step.steps.map((s, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="text-accent-400">{index + 1}.</span>
                        <span className="text-primary-200">{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div className="card p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Book className="w-6 h-6 text-accent-400" />
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white/5 rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-start gap-2">
                  <Info className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
                  {faq.question}
                </h3>
                <p className="text-sm text-primary-300 ml-7">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="card p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Common Issues & Solutions</h2>
          <div className="space-y-4">
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                "Access Denied" during installation
              </h3>
              <p className="text-sm text-primary-300 mb-2">
                Some installers require administrator privileges. Try running BuildSmith as Administrator.
              </p>
              <div className="bg-black/20 rounded p-2 text-xs font-mono text-primary-200">
                Right-click BuildSmith → Run as Administrator
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                Docker images fail to load
              </h3>
              <p className="text-sm text-primary-300 mb-2">
                Ensure Docker Desktop is running and WSL2 is properly configured.
              </p>
              <div className="bg-black/20 rounded p-2 text-xs font-mono text-primary-200">
                docker --version && wsl --status
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-accent-500" />
                VS Code extensions not installing
              </h3>
              <p className="text-sm text-primary-300 mb-2">
                Check your internet connection and ensure VS Code is closed during extension installation.
              </p>
            </div>
          </div>
        </div>

        {/* External Resources */}
        <div className="card p-6">
          <h2 className="text-2xl font-bold mb-4">External Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="#"
              className="bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-colors flex items-center justify-between"
            >
              <div>
                <h3 className="font-semibold mb-1">GitHub Repository</h3>
                <p className="text-xs text-primary-300">View source code and report issues</p>
              </div>
              <ExternalLink className="w-5 h-5 text-accent-400" />
            </a>
            <a
              href="#"
              className="bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-colors flex items-center justify-between"
            >
              <div>
                <h3 className="font-semibold mb-1">Documentation</h3>
                <p className="text-xs text-primary-300">Complete user guide</p>
              </div>
              <ExternalLink className="w-5 h-5 text-accent-400" />
            </a>
            <a
              href="#"
              className="bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-colors flex items-center justify-between"
            >
              <div>
                <h3 className="font-semibold mb-1">Community Forum</h3>
                <p className="text-xs text-primary-300">Get help from the community</p>
              </div>
              <ExternalLink className="w-5 h-5 text-accent-400" />
            </a>
            <a
              href="#"
              className="bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-colors flex items-center justify-between"
            >
              <div>
                <h3 className="font-semibold mb-1">Video Tutorials</h3>
                <p className="text-xs text-primary-300">Watch step-by-step guides</p>
              </div>
              <ExternalLink className="w-5 h-5 text-accent-400" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
