# Create Desktop Shortcut for Easy Backups

$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "Backup SchoolPro.lnk"
$targetPath = "powershell.exe"
$scriptPath = Join-Path $PSScriptRoot "backup-database.ps1"
$iconPath = "C:\Windows\System32\imageres.dll"

$WScriptShell = New-Object -ComObject WScript.Shell
$shortcut = $WScriptShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetPath
$shortcut.Arguments = "-ExecutionPolicy Bypass -NoExit -File `"$scriptPath`""
$shortcut.WorkingDirectory = $PSScriptRoot
$shortcut.Description = "Backup SchoolPro Database"
$shortcut.IconLocation = "$iconPath,4"
$shortcut.Save()

Write-Host "Desktop shortcut created!" -ForegroundColor Green
Write-Host "You can now double-click 'Backup SchoolPro' on your desktop to create backups." -ForegroundColor Cyan
