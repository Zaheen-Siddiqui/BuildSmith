# BuildSmith

**Automated Development Environment Replication**

BuildSmith is a powerful desktop application that captures your entire development environment and recreates it on any Windows machine with a single click. No more manual setup, missing dependencies, or configuration errors when switching computers or onboarding team members.

## 🚀 Features

### Complete Environment Capture
- **Docker Images** - All your containers with exact tags
- **Package Managers** - npm, Python pip packages with versions
- **VS Code Extensions & Profiles** - Your entire editor setup
- **Database Connections** - MongoDB, PostgreSQL configurations
- **Environment Variables** - PATH entries and custom variables
- **Git Configuration** - Username, email, and all global settings
- **Developer Tools** - Detected and catalogued

### Automatic Installation
BuildSmith automatically installs missing prerequisites including:
- Docker Desktop (with WSL2)
- Visual Studio Code
- Node.js & npm
- Python & pip
- Git
- MongoDB & PostgreSQL
- **Java JDK** (for Java development)
- **MinGW-w64** (for C/C++ development)
- **AWS CLI** (for cloud development)
- **Terraform** (for infrastructure as code)
- **Azure CLI** (for Azure development)

### Smart Bundling
- **Encrypted Bundles** - Secure export with password protection
- **Portable** - Single .zip file contains everything
- **Offline-Ready** - All installers and packages included
- **Version Locked** - Exact versions preserved

## 📥 Installation

### Download
Download the latest release from the [Releases page](https://github.com/Zaheen-Siddiqui/BuildSmith/releases):
- **BuildSmith Setup.exe** - Standard Windows installer (recommended)
- **BuildSmith Portable.exe** - Portable version, no installation required

### System Requirements
- Windows 10/11 (64-bit)
- Administrator access (for installing prerequisites)
- 500MB+ free disk space

### First Launch
1. Run the installer or portable executable
2. Click **"Scan Current System"** to create your first bundle
3. Select what to include (Docker images, packages, extensions, etc.)
4. Choose output location and set encryption password
5. Wait for bundle creation to complete

## 🎯 Usage

### Creating a Bundle

1. **Launch BuildSmith**
2. **Navigate to Dashboard** → Click "New Bundle"
3. **Select Components:**
   - ✅ Docker Images
   - ✅ npm Packages
   - ✅ Python Packages
   - ✅ VS Code Extensions & Profiles
   - ✅ Database Connections
   - ✅ Environment Variables
   - ✅ Git Configuration
4. **Configure Bundle:**
   - Choose output directory
   - Set encryption password (optional but recommended)
   - Name your bundle
5. **Scan & Create:**
   - Click "Create Bundle"
   - BuildSmith scans your system (1-5 minutes)
   - Bundle saved as `.zip` file

### Restoring on New Machine

1. **Install BuildSmith** on the new computer
2. **Import Bundle:**
   - Click "Import Bundle"
   - Select your `.zip` bundle file
   - Enter decryption password
3. **Review & Confirm:**
   - Preview what will be installed
   - Confirm prerequisites to install
4. **Automated Setup:**
   - BuildSmith installs all prerequisites (Docker, VS Code, etc.)
   - Restores Docker images, packages, extensions
   - Configures environment variables and PATH
   - Applies git configuration
   - *May require system restart for WSL2/Docker*
5. **Done!** Your environment is restored exactly as it was

## 🏗️ Architecture

BuildSmith consists of:
- **Electron Frontend** - Modern React UI with TypeScript
- **PowerShell Backend** - Robust Windows automation
- **Module System:**
  - `prerequisites.psm1` - Auto-installation of 15+ developer tools
  - `docker.psm1` - Docker image scanning & restoration
  - `drivers.psm1` - npm/Python package management
  - `vscode.psm1` - VS Code profile & extension handling
  - `db.psm1` - Database configuration
  - `environment.psm1` - PATH and environment variables
  - `gitconfig.psm1` - Git configuration capture/restore
  - `encryption.psm1` - Bundle encryption/decryption

### Bundle Structure
```
BuildSmith-Bundle.zip
├── bundle.json           # Metadata & manifest
├── environment.json      # PATH and env vars
├── gitconfig.json        # Git global config
├── packages.json         # npm/Python packages
├── manifests.json        # Package-lock files
├── databases/
│   └── connections.json  # DB connection strings
├── images/
│   ├── nginx.tar        # Docker images
│   └── node.tar
├── installers/
│   ├── Git.exe          # Prerequisite installers
│   ├── Node.js.msi
│   └── metadata.json
└── profiles/
    └── Default_Profile-profile.json  # VS Code profiles
```

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm 9+
- PowerShell 5.1+ (Windows built-in)

### Build from Source
```powershell
# Clone repository
git clone https://github.com/Zaheen-Siddiqui/BuildSmith.git
cd BuildSmith

# Install dependencies
cd packages/ui
npm install

# Run in development mode
npm run electron:dev

# Build for production
npm run build
```

### Project Structure
```
BuildSmith/
├── packages/
│   ├── backend/          # PowerShell automation
│   │   ├── setup.ps1     # Main setup orchestrator
│   │   ├── scan.ps1      # System scanning
│   │   ├── runner.ps1    # IPC bridge
│   │   └── modules/      # Feature modules
│   └── ui/              # Electron + React app
│       ├── electron/     # Main process
│       ├── src/         # React components
│       └── e2e/         # Playwright tests
├── test-bundle/         # Sample bundle for testing
└── scripts/            # Build & test scripts
```

### Testing
```powershell
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test prerequisite detection
.\test-prerequisites.ps1

# Test full setup workflow
.\test-setup.ps1
```

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- UI powered by [React](https://react.dev/) and [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Lucide](https://lucide.dev/)

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/Zaheen-Siddiqui/BuildSmith/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Zaheen-Siddiqui/BuildSmith/discussions)

---

**Made with ❤️ for developers who value their time**
