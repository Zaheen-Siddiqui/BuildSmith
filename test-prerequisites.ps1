# Test Prerequisites Module

$PSScriptRoot = "C:\Users\siddi\OneDrive\Desktop\BuildSmith\packages\backend"
. "$PSScriptRoot/common.ps1"
Import-Module "$PSScriptRoot/modules/prerequisites.psm1" -Force

Write-Host "`n=== Testing Prerequisite Detection ===" -ForegroundColor Cyan

$tools = @('docker', 'code', 'node', 'npm', 'python', 'pip', 'git', 'wsl', 'mongodb', 'postgresql', 'jdk', 'mingw', 'awscli', 'terraform', 'azurecli')

foreach ($tool in $tools) {
    $status = Test-PrerequisiteInstalled -ToolName $tool
    
    if ($status.installed) {
        Write-Host "✅ $tool" -ForegroundColor Green -NoNewline
        Write-Host " - v$($status.version)" -ForegroundColor Gray
    } else {
        Write-Host "❌ $tool" -ForegroundColor Red -NoNewline
        Write-Host " - Not installed" -ForegroundColor Gray
    }
}

Write-Host "`n=== Testing Download URL Generation ===" -ForegroundColor Cyan

$prerequisites = @('docker', 'vscode', 'nodejs', 'python', 'git', 'wsl', 'mongodb', 'postgresql', 'jdk', 'mingw', 'awscli', 'terraform', 'azurecli')

foreach ($prereq in $prerequisites) {
    $info = Get-PrerequisiteDownloadInfo -ToolName $prereq
    Write-Host "`n$prereq" -ForegroundColor Yellow
    Write-Host "  URL: $($info.url)" -ForegroundColor Gray
    Write-Host "  File: $($info.fileName)" -ForegroundColor Gray
    Write-Host "  Args: $($info.installArgs)" -ForegroundColor Gray
}

Write-Host "`n"
