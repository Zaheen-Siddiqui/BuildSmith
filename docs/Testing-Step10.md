# Testing Step 10 - Real Backend Operations

## Test Bundle Created

**Location:** `C:\Users\siddi\OneDrive\Desktop\BuildSmith\packages\ui\Test_Bundle.zip`

**Contents:**
- `manifest.json` - Bundle metadata
- `vscode-profile.json` - 3 VS Code extensions (ESLint, Prettier, Python)

## What to Test

### 1. Setup Workflow Test
1. **Navigate to Dashboard** → Click "Setup" or "Import Bundle"
2. **Import the Test Bundle:**
   - The bundle is already in `packages/ui/Test_Bundle.zip`
   - Select it when prompted
3. **Select Items to Install:**
   - Check "VS Code Extensions & Profiles"
   - Check "Docker Images"
4. **Start Installation**
5. **Observe Real Backend Behavior:**

#### Expected Output in Terminal/Logs:

```
BuildSmith backend runner started
PowerShell version: 5.1.x
OS: Microsoft Windows NT 10.0.x
Processing command: startSetup
Starting setup operation
Starting setup from bundle: Test_Bundle.zip
Extracting bundle...
Bundle from: TEST-MACHINE
Created: 2025-12-11T12:00:00Z
Installing VS Code extensions...
Installing: dbaeumer.vscode-eslint
Installing: esbenp.prettier-vscode
Installing: ms-python.python
Processing Docker image: nginx:latest
```

#### Expected UI Behavior:

✅ **Real-time logs** appear in the terminal section
✅ **Progress bars** update as extensions install
✅ **Status changes** from "Initializing" → "Installing" → "Complete"
✅ **Step-by-step progress** shown (extract → VS Code → Docker)

### 2. What's Working (Real Backend)

- ✅ PowerShell backend starts successfully
- ✅ JSON events stream from PowerShell → Electron → React
- ✅ Commands flow from React → Electron → PowerShell
- ✅ Bundle extraction works
- ✅ Manifest parsing works
- ✅ Extension installation simulation with progress
- ✅ Docker image handling simulation
- ✅ Abort functionality
- ✅ Error handling and reporting

### 3. What's Still Simulated (Stubs)

- ⏳ VS Code extensions **display progress** but don't actually install (would need `code` CLI available)
- ⏳ Docker images **display progress** but don't actually pull (would need Docker running)
- ⏳ Real file downloads not implemented yet
- ⏳ GPG encryption not implemented yet

### 4. Module Functions Available (But Not Yet Integrated)

The following **real** implementations exist in modules but aren't called yet:

**installers.psm1:**
- `Download-File()` - Real HTTP download with progress
- `Run-Installer()` - Execute .exe/.msi with silent args
- `Add-ToPath()` - Modify PATH environment variable
- `Test-Checksum()` - SHA256 verification

**vscode.psm1:**
- `Export-VSCodeProfile()` - Scan real VS Code installation
- `Import-VSCodeProfile()` - Restore settings and install extensions via `code` CLI
- `Install-VSCodeExtensions()` - Real extension installation

**docker.psm1:**
- `Get-DockerImages()` - List local Docker images
- `Save-DockerImage()` - Export image to tar
- `Load-DockerImage()` - Import image from tar
- `Pull-DockerImage()` - Download from registry

## How to Test Each Function

### Test Real Download (PowerShell)
```powershell
cd C:\Users\siddi\OneDrive\Desktop\BuildSmith\packages\backend
Import-Module .\modules\installers.psm1 -Force
. .\common.ps1

Download-File -Url "https://www.7-zip.org/a/7z2408-x64.exe" `
              -OutputPath "C:\temp\7zip.exe" `
              -ExpectedChecksum "YOUR_SHA256_HERE"
```

### Test VS Code Export (PowerShell)
```powershell
Import-Module .\modules\vscode.psm1 -Force
. .\common.ps1

Export-VSCodeProfile -OutputPath "C:\temp\my-profile.json"
```

### Test Docker Image List (PowerShell)
```powershell
Import-Module .\modules\docker.psm1 -Force
. .\common.ps1

Get-DockerImages
```

## Current Test Results

When you run the app and go through the setup flow with `Test_Bundle.zip`, you should see:

1. ✅ **Backend starts** - "BuildSmith backend runner started" in terminal
2. ✅ **Bundle extracts** - Manifest parsed successfully
3. ✅ **VS Code section** - 3 extensions listed, progress bars update
4. ✅ **Docker section** - nginx:latest shown, simulated pull
5. ✅ **Completion** - "Installation complete" message

## Next Steps

After confirming this works:

1. **Update scan workflow** to use real IPC (currently uses mock)
2. **Integrate real module functions** into setup.ps1
3. **Implement scan.ps1** to create real bundles with actual system data
4. **Add GPG encryption** for secrets
5. **Test end-to-end flow**: Real scan → Real bundle → Real setup

## Troubleshooting

**If backend doesn't start:**
- Check terminal output for PowerShell errors
- Verify `common.ps1` exists in packages/backend/
- Check that functions are defined before use

**If no logs appear:**
- Check browser console for IPC errors
- Verify `window.electronAPI` is defined
- Check Electron main process console

**If bundle not found:**
- Verify `Test_Bundle.zip` is in `packages/ui/`
- Check file path in setup command
- Look for extraction errors in terminal

## Success Criteria

✅ Backend PowerShell process starts
✅ Real-time logs stream to UI
✅ Progress updates work
✅ Bundle extraction succeeds
✅ VS Code and Docker steps execute
✅ Completion event received
✅ No JSON parse errors
✅ Abort button works
