# Test Bundle - Updated Structure

## Bundle Format
The test bundle has been updated to match the actual BuildSmith bundle format:

```
test-bundle/
├── bundle.json              # Bundle metadata (id, name, version, etc.)
├── manifests.json           # List of all items with type and source
├── environment.json         # Environment variables and PATH entries
├── packages.json            # npm and pip packages
├── databases/
│   └── connections.json     # Database connection configs
├── installers/
│   ├── Git_metadata.json
│   ├── Node.js_metadata.json
│   └── npm_metadata.json
├── profiles/
│   └── vscode_profile.json  # VS Code extensions and settings
└── images/                  # Docker image .tar files (empty for test)
```

## Docker Image .tar Extraction Issue

### Problem
When extracting Docker image `.tar` files on Windows, you may encounter:
```
Error 0x80070057: The parameter is incorrect.
```

### Root Cause
This error occurs because:
1. Docker saves images as `.tar` archives using POSIX tar format
2. Windows Explorer and built-in extraction tools don't fully support POSIX tar format
3. The tar files contain special characters, long paths, or metadata that Windows can't handle

### Solutions

#### Option 1: Use 7-Zip (Recommended)
1. Download and install [7-Zip](https://www.7-zip.org/)
2. Right-click the `.tar` file → 7-Zip → Extract Here
3. 7-Zip has better POSIX tar format support

#### Option 2: Use PowerShell with tar Command
Windows 10+ includes `tar` command:
```powershell
# Extract a single .tar file
tar -xf experiment5-server3_latest.tar

# Extract all .tar files in current directory
Get-ChildItem *.tar | ForEach-Object { tar -xf $_.Name }
```

#### Option 3: Use Docker to Load Images Directly
Instead of extracting, load the images back into Docker:
```powershell
# Load a single image
docker load -i experiment5-server3_latest.tar

# Load all .tar files
Get-ChildItem *.tar | ForEach-Object { docker load -i $_.Name }
```

#### Option 4: Use WSL (Windows Subsystem for Linux)
```bash
# In WSL terminal
tar -xf /mnt/c/Users/siddi/OneDrive/Desktop/BuildSmith/Bundle_2025-12-16/images/experiment5-server3_latest.tar
```

### Why This Happens with BuildSmith Bundles
BuildSmith uses `docker save` to export images, which creates POSIX tar archives. These are:
- ✅ Perfect for Docker (docker load)
- ✅ Perfect for Linux systems
- ⚠️ Problematic for Windows Explorer
- ✅ OK with 7-Zip or Windows tar command

### Recommendation for BuildSmith Users
**Don't extract Docker image .tar files manually.** Instead:
1. Use BuildSmith's import bundle feature
2. BuildSmith will handle loading images with `docker load` automatically
3. The .tar files are meant to be consumed by Docker, not extracted manually

## Testing the Bundle

To test this bundle:
1. Use BuildSmith's import feature
2. Point to the `test-bundle` folder
3. The app will read all JSON files and present them in the UI
4. Docker images folder is empty (test doesn't need actual image files)

## Differences from Real Bundle

This test bundle:
- ✅ Matches the exact JSON structure
- ✅ Has all required files and folders
- ❌ Does NOT include actual Docker image .tar files (would be 100+ MB)
- ❌ Does NOT include encrypted data

For full testing with images, use the real bundle at:
`C:\Users\siddi\OneDrive\Desktop\BuildSmith\Bundle_2025-12-16`
