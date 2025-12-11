# Testing Step 9 - Backend IPC Integration

## Quick Start

### 1. Test in Browser (Mock Backend)

```bash
cd packages/ui
npm run dev
```

**Expected Behavior**:
- Console shows: `[ServiceFactory] Using mock IPC service (browser environment)`
- UI works normally with simulated operations
- No real PowerShell backend runs

### 2. Test in Electron (Real Backend)

```bash
cd packages/ui
npm run electron:dev
```

**Expected Behavior**:
- Console shows: `[ServiceFactory] Using real IPC service (Electron environment)`
- Terminal shows PowerShell startup logs:
  ```
  BuildSmith backend runner started
  PowerShell version: 7.x.x
  OS: Microsoft Windows 10.x.x
  ```
- All IPC events flow through real backend

## Test Scenarios

### Scenario 1: Scan Workflow

1. Click "Scan" on Dashboard
2. Select items to scan (VS Code, Docker, etc.)
3. Click "Start Scan"
4. **Verify**:
   - Console shows IPC commands being sent
   - Terminal shows PowerShell receiving commands
   - Backend emits scan events
   - UI displays progress

### Scenario 2: Setup Workflow

1. Import a bundle (use sample/mock bundle)
2. Select items to install
3. Click "Start Installation"
4. **Verify**:
   - SetupProgressPage receives backend events
   - Real-time logs appear
   - Progress bars update
   - Status icons change correctly

### Scenario 3: Abort Operation

1. Start any operation
2. Click "Abort" button
3. **Verify**:
   - `abort` command sent via IPC
   - PowerShell receives abort flag
   - Operation stops gracefully
   - UI shows aborted state

## Debugging

### Check if Electron API is available

Open DevTools (Ctrl+Shift+I) and run:

```javascript
console.log('Electron API:', window.electronAPI)
console.log('Is Electron:', !!window.electronAPI)
```

### Monitor IPC Communication

All IPC calls are logged with `[IPC]` prefix:

```
[IPC] Sending command: startScan {...}
[IPC] Received event: status {...}
[IPC] Received event: log {...}
```

### Monitor PowerShell Backend

Terminal output shows:

```
[runner] Processing command: startScan
[runner] Starting scan operation
```

### Common Issues

**Issue**: "Backend process error: spawn pwsh ENOENT"
- **Cause**: PowerShell Core (pwsh) not installed
- **Solution**: Install PowerShell 7+ from https://aka.ms/powershell

**Issue**: "Cannot send command - not running in Electron"
- **Cause**: Using real IPC service in browser
- **Solution**: Service factory should auto-detect and use mockIPC

**Issue**: "Backend process exited with code 1"
- **Cause**: PowerShell script error
- **Solution**: Check terminal stderr output for error details

## File Locations

### Frontend (Renderer)
- `packages/ui/src/services/ipc.ts` - Real IPC service
- `packages/ui/src/services/mockIPC.ts` - Mock service
- `packages/ui/src/services/index.ts` - Service factory
- `packages/ui/src/window.d.ts` - TypeScript types

### Electron (Main Process)
- `packages/ui/electron/main.ts` - IPC handlers
- `packages/ui/electron/preload.ts` - Bridge to renderer

### Backend (PowerShell)
- `packages/backend/runner.ps1` - Entry point
- `packages/backend/scan.ps1` - Scan logic
- `packages/backend/setup.ps1` - Setup logic
- `packages/backend/modules/*.psm1` - Functional modules

## Next Steps

Once Step 9 is verified working:

1. **Step 10.1**: Implement real installer downloads
2. **Step 10.2**: Implement real VS Code operations
3. **Step 10.3**: Implement real Docker operations
4. **Step 10.4**: Implement bundle encryption
5. **Step 10.5**: Implement database restore
6. **Step 10.6**: Implement driver installation

## Success Criteria

- ✅ Browser mode uses mockIPC automatically
- ✅ Electron mode uses real IPC automatically
- ✅ PowerShell backend starts without errors
- ✅ Commands sent from UI reach PowerShell
- ✅ Events from PowerShell reach UI
- ✅ Abort command works
- ✅ No TypeScript errors
- ✅ No console errors

## Reference

See `docs/ipc-schema.md` for complete IPC protocol documentation.
