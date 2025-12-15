# DevOps Tools, Environment & PATH, and Package Dependencies - Implementation Summary

## Overview
Implemented three new features for BuildSmith to scan, bundle, and restore DevOps tools, environment variables, PATH entries, and package manager dependencies across development environments.

## Components Implemented

### 1. Backend PowerShell Modules

#### devtools.psm1
- **Get-InstalledDevTools**: Scans for 20+ DevOps CLI tools (terraform, kubectl, helm, AWS CLI, Azure CLI, docker-compose, ansible, packer, vagrant, pulumi, ArgoCD, Flux, GitHub CLI, etc.)
  - Detects installation and version using each tool's version command
  - Returns tool name, command, version, and path
  
- **Install-DevTool**: Installs DevOps tools on target machine
  - Supports winget (primary), chocolatey, and pip installation methods
  - Checks if tool is already installed to avoid duplicates
  - Returns success status and installation details
  - Supports version-specific installations
  - Tools mapped to package managers:
    - winget: terraform, kubectl, helm, docker-compose, AWS CLI, Azure CLI, packer, vagrant, pulumi, jq, yq, GitHub CLI, GitLab CLI
    - chocolatey: ArgoCD CLI, Flux CLI, SonarQube Scanner
    - pip: Ansible
    - custom (manual): Google Cloud SDK

#### env.psm1
- **Get-EnvironmentVariables**: Scans system and user environment variables
  - Filters out sensitive variables (PASSWORD, SECRET, TOKEN, KEY, API_KEY, etc.)
  - Returns variable name, value, and scope (system/user)
  
- **Get-SystemPath**: Scans PATH entries from system and user scopes
  - Validates that paths exist on disk
  - Deduplicates entries that appear in both system and user PATH
  - Returns path, scope, and existence status

- **Set-EnvironmentVariable**: Sets environment variables on target machine
  - Supports both system and user scope
  - Checks if variable already has the correct value
  - Requires admin privileges for system scope
  
- **Add-PathEntry**: Adds directories to PATH without duplicates
  - Supports both system and user scope
  - Checks if path already exists before adding
  - Requires admin privileges for system scope

#### installers.psm1
- **Get-InstalledPackages**: Scans globally installed packages
  - npm: Global packages from `npm list -g`
  - pip: All Python packages from `pip list`
  - winget: Installed applications from `winget list`
  - chocolatey: Installed packages from `choco list --local-only`
  - Returns package name, version, and manager

- **Install-Package**: Installs packages via their respective managers
  - npm: `npm install -g package[@version]`
  - pip: `pip install package[==version]`
  - winget: `winget install --id package --exact --silent [--version version]`
  - chocolatey: `choco install package -y [--version=version]`
  - Checks if package manager is available before installation
  - Returns success status and installation details

#### runner.ps1 Command Handlers
Added three new setup command handlers:

- **setupDevTools**: Installs selected DevOps tools
  - Imports devtools.psm1
  - Iterates through tool list and calls Install-DevTool
  - Emits progress logs and results
  - Returns success count and failed count

- **setupEnvironment**: Sets environment variables and PATH entries
  - Imports env.psm1
  - Sets each selected environment variable with Set-EnvironmentVariable
  - Adds each selected PATH entry with Add-PathEntry
  - Returns separate results for variables and paths

- **setupPackages**: Installs selected packages
  - Imports installers.psm1
  - Iterates through package list and calls Install-Package
  - Handles all four package managers (npm, pip, winget, chocolatey)
  - Returns success count and failed count

### 2. Frontend Scan Pages (Bundle Creation)

#### DevToolsPage.tsx (packages/ui/src/pages/scan/)
- Auto-scans for DevOps tools on mount
- Displays tools in a list with name, version, command, and path
- Select/deselect all functionality
- Updates bundleStore with selected tools
- Navigates based on setupSelections (environment, packages, or bundle preview)

#### EnvironmentPage.tsx (packages/ui/src/pages/scan/)
- Two-tab interface: Environment Variables and PATH Entries
- Auto-scans environment and PATH on mount
- Search functionality for both tabs
- Scope filtering (system/user) for both tabs
- Security notice about filtered sensitive variables
- Select all/deselect all per tab
- Updates bundleStore with selected variables and path entries
- Navigates to packages or bundle preview

#### PackagesPage.tsx (packages/ui/src/pages/scan/)
- Auto-scans packages from all managers on mount
- Package manager filter (All, npm, pip, winget, chocolatey)
- Color-coded manager badges (blue for npm, green for pip, purple for winget, brown for chocolatey)
- Select all/deselect all per manager filter
- Updates bundleStore with selected packages
- Always navigates to bundle preview (last scan step)

### 3. Frontend Setup Pages (Bundle Restoration)

#### SetupDevToolsPage.tsx (packages/ui/src/pages/setup/)
- Extracts tools from manifest where `type === 'installer'`
- Displays tool name, version, and installation command
- Select/deselect all functionality
- Placeholder for "already installed" detection
- Navigates to environment, packages, or preview based on setupSelections

#### SetupEnvironmentPage.tsx (packages/ui/src/pages/setup/)
- Two-tab interface: Environment Variables and PATH Entries
- Extracts variables from manifest where `name.startsWith('ENV:')`
- Extracts PATH entries from manifest where `name.startsWith('PATH:')`
- Displays scope indicators (system/user) with color coding
- Info banner warns about admin requirements for system-scoped items
- Select all/deselect all per tab
- Navigates to packages or preview

#### SetupPackagesPage.tsx (packages/ui/src/pages/setup/)
- Extracts packages from manifest where `type === 'package'`
- Parses format "manager:packagename" from manifest names
- Manager filter (All, npm, pip, winget, chocolatey)
- Color-coded manager badges matching scan page
- Select all per manager
- Always navigates to preview (last setup step)

### 4. TypeScript Types and State Management

#### IPC Types (packages/ui/src/types/ipc.ts)
Added command types:
- **SetupDevToolsCommand**: Contains array of tools with name, version, command
- **SetupEnvironmentCommand**: Contains arrays of variables and pathEntries with name, value, scope
- **SetupPackagesCommand**: Contains array of packages with name, version, manager

Added result types:
- **SetupDevToolsResult**: Success status, array of results, success/failed counts
- **SetupEnvironmentResult**: Success status, separate results for variables and paths
- **SetupPackagesResult**: Success status, array of results, success/failed counts

Added scan result types:
- **DevToolsScanResult**: Array of tools with id, name, command, version, path
- **EnvironmentScanResult**: Arrays of variables and pathEntries with id, name, value, scope
- **PackagesScanResult**: Array of packages with id, name, version, manager

#### Bundle Store (packages/ui/src/store/bundleStore.ts)
Added state:
```typescript
selectedDevTools: DevTool[]
selectedEnvironmentVars: EnvironmentVariable[]
selectedPathEntries: PathEntry[]
selectedPackages: Package[]
scanProgress: {
  devtools: boolean
  environment: boolean
  packages: boolean
}
setupSelections: {
  devtools: boolean
  environment: boolean
  packages: boolean
}
```

Added toggle functions:
- `toggleDevTool(tool: DevTool)`
- `toggleEnvironmentVar(variable: EnvironmentVariable)`
- `togglePathEntry(entry: PathEntry)`
- `togglePackage(pkg: Package)`

### 5. Navigation Flow

#### Scan Flow (Bundle Creation)
1. VS Code Profiles (if selected)
2. Docker Images (if selected)
3. Database Connections (if selected)
4. **DevOps Tools** (if selected) → EnvironmentPage or PackagesPage or BundlePreviewPage
5. **Environment & PATH** (if selected) → PackagesPage or BundlePreviewPage
6. **Packages** (if selected) → BundlePreviewPage (always last)
7. Bundle Preview

#### Setup Flow (Bundle Restoration)
1. Import Bundle
2. Setup Configuration (select features)
3. VS Code Profiles (if selected)
4. Docker Images (if selected)
5. Database Connections (if selected)
6. **DevOps Tools** (if selected) → SetupEnvironmentPage or SetupPackagesPage or SetupPreviewPage
7. **Environment & PATH** (if selected) → SetupPackagesPage or SetupPreviewPage
8. **Packages** (if selected) → SetupPreviewPage (always last)
9. Setup Preview
10. Setup Progress (actual installation happens here)
11. Setup Complete

### 6. Manifest Format

All selected items are stored in the bundle manifest with this structure:

**DevOps Tools:**
```json
{
  "name": "terraform",
  "version": "1.6.0",
  "type": "installer",
  "source": "terraform"
}
```

**Environment Variables:**
```json
{
  "name": "ENV:JAVA_HOME",
  "version": "system",
  "type": "secret",
  "source": "environment"
}
```

**PATH Entries:**
```json
{
  "name": "PATH:C:\\Git\\cmd",
  "version": "user",
  "type": "secret",
  "source": "path"
}
```

**Packages:**
```json
{
  "name": "npm:react",
  "version": "18.2.0",
  "type": "package",
  "source": "npm"
}
```

## Git Commits

1. **c472cb0**: Backend PowerShell scanners (devtools.psm1, env.psm1, installers.psm1)
2. **035cb76**: Frontend scan pages (DevToolsPage, EnvironmentPage, PackagesPage)
3. **a35a55e**: Frontend setup pages (SetupDevToolsPage, SetupEnvironmentPage, SetupPackagesPage)
4. **49d8129**: Backend restore functions (Install-DevTool, Set-EnvironmentVariable, Add-PathEntry, Install-Package)

## Files Modified/Created

**Backend:**
- packages/backend/modules/devtools.psm1 (added Install-DevTool)
- packages/backend/modules/env.psm1 (refactored, added Set-EnvironmentVariable, Add-PathEntry)
- packages/backend/modules/installers.psm1 (added Install-Package)
- packages/backend/runner.ps1 (added setupDevTools, setupEnvironment, setupPackages handlers)

**Frontend:**
- packages/ui/src/pages/scan/DevToolsPage.tsx (created)
- packages/ui/src/pages/scan/EnvironmentPage.tsx (created)
- packages/ui/src/pages/scan/PackagesPage.tsx (created)
- packages/ui/src/pages/setup/SetupDevToolsPage.tsx (created)
- packages/ui/src/pages/setup/SetupEnvironmentPage.tsx (created)
- packages/ui/src/pages/setup/SetupPackagesPage.tsx (created)
- packages/ui/src/types/ipc.ts (added command and result types)
- packages/ui/src/store/bundleStore.ts (added state and toggles)
- packages/ui/src/App.tsx (added routes)
- packages/ui/src/pages/setup/SetupConfigPage.tsx (updated navigation)
- packages/ui/src/pages/setup/SetupVSCodePage.tsx (updated navigation)
- packages/ui/src/pages/setup/SetupDockerPage.tsx (updated navigation)
- packages/ui/src/pages/setup/SetupDatabasesPage.tsx (updated navigation)

## Next Steps

1. **Wire Setup Pages to Backend**: Update SetupProgressPage to invoke the setupDevTools, setupEnvironment, and setupPackages IPC commands
2. **Implement Already Installed Detection**: Add UI feedback for tools/packages already present on the system
3. **Testing**:
   - Test DevOps tool installation for each supported tool
   - Test environment variable setting with system vs user scope
   - Test PATH entry addition without duplicates
   - Test package installation across all four managers
   - Test end-to-end: scan → create bundle → import → restore
4. **Error Handling**: Add better error messages and recovery options for failed installations
5. **Admin Privileges**: Implement UAC elevation prompts for system-scoped operations
6. **Installation Progress**: Add real-time progress feedback during package/tool installation
7. **Rollback**: Implement ability to undo environment/PATH changes if setup fails

## Technical Notes

- Environment variables and PATH entries use scope (system/user) to determine whether admin privileges are required
- DevOps tool installation tries winget first, falls back to chocolatey/pip based on tool mapping
- Package installation validates that the package manager is available before attempting installation
- All scan functions filter sensitive data (passwords, tokens, keys) for security
- All restore functions check for existing installations to avoid duplicates
- Manifest uses type and name prefixes to categorize items for restoration
- Navigation is conditional based on which features the user selected in setup configuration
