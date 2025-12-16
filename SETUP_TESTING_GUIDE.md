# BuildSmith Setup Phase Testing Guide

## Overview
This guide provides comprehensive testing instructions for the setup phase implementation.

## Setup Phase Implementation Status

### ✅ Implemented Components

#### 1. **Import Bundle Page** (`/import`)
- **Status**: Fully implemented
- **Features**:
  - File selection dialog (via Electron API)
  - Bundle validation (.buildsmith or .zip files)
  - Encryption detection and passphrase input
  - Bundle metadata parsing
  - Manifest item loading
  - Auto-detection of bundle categories
- **Store Integration**: 
  - `setImportedBundle()` - stores bundle metadata
  - `setManifestItems()` - stores manifest items
  - `setScanSettings()` - auto-configures based on bundle content

#### 2. **Setup Configuration Page** (`/setup-config`)
- **Status**: Fully implemented
- **Features**:
  - Display all available categories from bundle
  - Category selection (VS Code, Docker, Databases, DevTools, Environment, Packages)
  - Select All / Deselect All functionality
  - Progress tracking (X of Y categories selected)
  - Smart navigation to first selected category
- **Store Integration**:
  - `setSetupSelections()` - saves user's category choices

#### 3. **VS Code Setup Page** (`/setup-vscode`)
- **Status**: Fully implemented
- **Features**:
  - List all VS Code extensions from bundle
  - Individual extension selection
  - Extension metadata display (name, version, publisher)
  - Skip option if no extensions selected
- **Store Integration**:
  - `setSelectedSetupVSCodeProfiles()` - saves selected extensions

#### 4. **Docker Setup Page** (`/setup-docker`)
- **Status**: Fully implemented
- **Features**:
  - List all Docker images from bundle
  - Individual image selection
  - Image metadata display (repository, tag, size)
  - Skip option if no images selected
- **Store Integration**:
  - `setSelectedSetupDockerImages()` - saves selected images

#### 5. **Database Setup Page** (`/setup-databases`)
- **Status**: Fully implemented
- **Features**:
  - List all database connections from bundle
  - Individual database selection
  - Database metadata display (type, host, port, database name)
  - Skip option if no databases selected
- **Store Integration**:
  - `setSelectedSetupDatabases()` - saves selected databases

#### 6. **DevTools Setup Page** (`/setup-devtools`)
- **Status**: Fully implemented
- **Features**:
  - List all DevOps tools/installers from bundle
  - Individual tool selection
  - Tool metadata display (name, version, path, type)
  - Categorization by type (VCS, Runtime, Package Manager, etc.)
  - Skip option if no tools selected

#### 7. **Environment Setup Page** (`/setup-environment`)
- **Status**: Fully implemented
- **Features**:
  - List environment variables from bundle
  - List PATH entries from bundle
  - Tab switching between Variables and PATH
  - Scope filtering (System/User)
  - Category filtering (All, Developer Tools, System, User)
  - Individual variable/path selection
  - Skip option if nothing selected

#### 8. **Packages Setup Page** (`/setup-packages`)
- **Status**: Fully implemented
- **Features**:
  - List packages from bundle
  - Group by package manager (npm, pip, winget, chocolatey)
  - Individual package selection
  - Package metadata display (name, version, manager)
  - Skip option if no packages selected

#### 9. **Setup Preview Page** (`/setup-preview`)
- **Status**: Partially implemented
- **Features**:
  - Preview all selected items before installation
  - Summary of selections by category
  - Start installation button

#### 10. **Setup Progress Page** (`/setup-progress`)
- **Status**: Partially implemented (UI ready, backend integration pending)
- **Features**:
  - Real-time progress tracking
  - Step-by-step status updates
  - Error handling and retry logic
  - Pause/Resume functionality

#### 11. **Setup Complete Page** (`/setup-complete`)
- **Status**: Fully implemented
- **Features**:
  - Success summary
  - List of installed items
  - Navigation to dashboard

### ⚠️ Backend Integration Pending
- Actual Docker image pulling
- Actual VS Code extension installation
- Actual package installation
- Actual environment variable setting
- Database connection establishment

---

## Test Bundle Overview

**Location**: `C:\Users\siddi\OneDrive\Desktop\BuildSmith\test-bundle\`

### Test Bundle Contents

#### Files:
1. `manifest.json` - Main bundle configuration
2. `vscode-profile.json` - VS Code extensions and settings

#### Categories in Test Bundle:

**1. VS Code Extensions (5 items)**
- ESLint 2.4.4
- Prettier 10.1.0
- Python 2023.22.1
- TypeScript Nightly 5.4.20231212
- Tailwind CSS IntelliSense 0.10.5

**2. Docker Images (2 items)** - Small, fast to test
- nginx:alpine (23MB)
- node:18-alpine (110MB)

**3. Databases (2 items)**
- Local MongoDB (localhost:27017)
- Development PostgreSQL (localhost:5432)

**4. DevTools (3 items)**
- Git 2.43.0
- Node.js 18.17.1
- npm 9.8.1

**5. Environment Variables (3 items)**
- NODE_ENV=development
- TEST_API_KEY=test-api-key-12345
- DOCKER_HOST=tcp://localhost:2375

**6. PATH Entries (3 items)**
- C:\Program Files\Git\cmd
- C:\Program Files\nodejs
- %USERPROFILE%\.npm-global

**7. Packages (5 items)**
- npm: typescript, eslint, prettier
- pip: requests, flask

---

## Testing Procedure

### Prerequisites
1. Start the development server: `npm run dev` (in packages/ui)
2. Open browser dev tools (F12) to view console logs
3. Navigate to `http://localhost:5173/`

### Test Flow

#### Test 1: Import Bundle
1. Click "Import Bundle" from dashboard
2. **Expected Console Logs**:
   ```
   [ImportPage] 📂 File selection initiated
   [ImportPage] ✅ Electron API available
   [ImportPage] 📄 File selection result: {...}
   [ImportPage] ✅ File selected: {...}
   ```
3. Select the test bundle file
4. Click "Import & Continue"
5. **Expected Console Logs**:
   ```
   [ImportPage] 🚀 Starting bundle import...
   [ImportPage] 📦 File path: ...
   [ImportPage] 🔐 Encrypted: false
   [ImportPage] ⏳ Simulating bundle parsing (1.5s)...
   [ImportPage] 📋 Bundle metadata: {...}
   [ImportPage] 📦 Manifest items count: 17
   [ImportPage] 📊 Manifest breakdown:
     - VS Code extensions: 5
     - Docker images: 2
     - Databases: 2
     - DevTools: 3
     - Packages: 5
   [ImportPage] 💾 Saving bundle metadata to store
   [ImportPage] 💾 Saving manifest items to store
   [ImportPage] 🔍 Auto-detected categories:
     - VS Code: true
     - Docker: true
     - Databases: true
     - DevTools: true
     - Packages: true
   [ImportPage] 🧭 Navigating to setup configuration...
   ```

#### Test 2: Setup Configuration
1. Should auto-navigate to `/setup-config`
2. **Verify Display**:
   - Should show 5 categories (VS Code, Docker, Databases, DevTools, Packages)
   - Each category should show item count
3. **Test Actions**:
   - Click "Select All" - all 5 categories should be selected
   - Click "Deselect All" - all should be deselected
   - Manually select specific categories
4. Click "Continue with X Categories"
5. **Expected Console Logs**:
   ```
   [SetupConfigPage] 🚀 Continue clicked
   [SetupConfigPage] ✅ Selected categories: {...}
   [SetupConfigPage] 📊 Available items:
     - VS Code extensions: 5
     - Docker images: 2
     - Databases: 2
     - DevTools: 3
     - Environment vars: 0
     - Packages: 5
   [SetupConfigPage] 🧭 Navigating to VS Code setup
   ```

#### Test 3: VS Code Extensions Selection
1. Should navigate to `/setup-vscode`
2. **Verify Display**:
   - Should show 5 extensions
   - Each extension shows name, version, publisher
3. **Test Selection**:
   - Click individual extensions to select/deselect
   - Verify selection count updates
4. Click "Continue with X Extensions"
5. Should navigate to next category (Docker)

#### Test 4: Docker Images Selection
1. Should navigate to `/setup-docker`
2. **Verify Display**:
   - Should show 2 images (nginx:alpine, node:18-alpine)
   - Each image shows repository, tag, size
3. **Test Selection**:
   - Select/deselect images
   - Verify selection count updates
4. Click "Continue with X Images"
5. Should navigate to Databases

#### Test 5: Database Connections Selection
1. Should navigate to `/setup-databases`
2. **Verify Display**:
   - Should show 2 databases (MongoDB, PostgreSQL)
   - Each shows type, host, port, database name
3. **Test Selection**:
   - Select/deselect databases
4. Click "Continue with X Databases"
5. Should navigate to DevTools

#### Test 6: DevTools Selection
1. Should navigate to `/setup-devtools`
2. **Verify Display**:
   - Should show 3 tools (Git, Node.js, npm)
   - Each shows name, version, path, type
   - Should be grouped by type
3. **Test Selection**:
   - Select/deselect tools
4. Click "Continue with X Tools"
5. Should navigate to Packages

#### Test 7: Packages Selection
1. Should navigate to `/setup-packages`
2. **Verify Display**:
   - Should show 5 packages
   - Grouped by manager (npm: 3, pip: 2)
   - Each shows name, version, manager
3. **Test Selection**:
   - Select/deselect packages
   - Expand/collapse package managers
4. Click "Continue with X Packages"
5. Should navigate to Preview

#### Test 8: Setup Preview
1. Should navigate to `/setup-preview`
2. **Verify Display**:
   - Should show summary of all selected items
   - Should show count for each category
3. Click "Start Installation"
4. Should navigate to Setup Progress

#### Test 9: Navigation & Back Buttons
1. Test "Back" button on each page
2. Verify it navigates to previous page
3. Verify selections are preserved when going back
4. Test "Skip" options on pages with skip functionality

#### Test 10: Cache Persistence
1. Make selections on any setup page
2. Refresh the browser (F5)
3. **Expected**: All selections should persist
4. **Console Check**: Look for Zustand persist logs

---

## Console Logging Format

All console logs follow this format:
```
[ComponentName] Icon Message
```

**Icons**:
- 📂 File operations
- ✅ Success/Confirmation
- ❌ Error
- ⚠️ Warning
- 🚀 Action started
- 🧭 Navigation
- 📦 Data/Bundle operations
- 💾 Store operations
- 🔍 Detection/Analysis
- ⏳ Waiting/Processing
- 📋 Metadata
- 📊 Statistics/Breakdown
- 🔐 Encryption/Security

---

## Known Limitations (Current Phase)

1. **No actual installation** - Backend integration pending
2. **Mock data** - ImportPage uses mock manifest data
3. **File validation** - Only checks extension, not actual bundle format
4. **No bundle creation** - Can't create actual .buildsmith files yet
5. **Environment setup** - Page exists but no environment vars in test bundle
6. **Progress page** - UI ready but no real progress updates

---

## Success Criteria

✅ **Pass Criteria**:
- All pages load without errors
- Console logs appear for each action
- Selections persist across navigation
- Back navigation works correctly
- Cache persists on refresh
- All UI elements are functional
- Navigation flow is correct (Import → Config → Selection Pages → Preview → Progress → Complete)

❌ **Fail Criteria**:
- JavaScript errors in console
- Pages don't load
- Selections are lost
- Navigation broken
- Cache doesn't persist
- UI elements not responsive

---

## Debugging Tips

1. **If file selection doesn't work**: Check if Electron API is available
2. **If bundle parsing fails**: Check manifest.json format
3. **If navigation skips pages**: Check category detection logic
4. **If selections don't persist**: Check Zustand persist middleware
5. **If console logs missing**: Check browser console filters

---

## Next Steps After Testing

1. Implement backend integration for actual installation
2. Add real bundle parsing (not mock data)
3. Implement environment variable setting
4. Add database connection testing
5. Implement package installation
6. Add Docker image pull functionality
7. Implement progress tracking with real backend events
