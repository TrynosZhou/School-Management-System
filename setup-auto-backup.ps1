# Automated Backup Setup Script for SchoolPro
# This script creates a Windows Task Scheduler task for daily backups

Write-Host "Setting up automated daily database backups..." -ForegroundColor Cyan

# Task details
$taskName = "SchoolPro Daily Backup"
$scriptPath = Join-Path $PSScriptRoot "backup-database.ps1"
$workingDir = $PSScriptRoot

# Check if script exists
if (-not (Test-Path $scriptPath)) {
    Write-Host "Error: backup-database.ps1 not found!" -ForegroundColor Red
    exit 1
}

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "Task already exists. Removing old task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create the scheduled task action
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File `"$scriptPath`"" `
    -WorkingDirectory $workingDir

# Create the trigger (daily at 2:00 AM)
$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM

# Create task settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable:$false `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1)

# Register the task
try {
    Register-ScheduledTask `
        -TaskName $taskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Description "Automatically backup SchoolPro database daily at 2:00 AM" `
        -RunLevel Highest | Out-Null
    
    Write-Host "`nSuccess! Automated backup is now configured." -ForegroundColor Green
    Write-Host "`nBackup Schedule:" -ForegroundColor Cyan
    Write-Host "  - Time: Every day at 2:00 AM"
    Write-Host "  - Location: $workingDir\backups\"
    Write-Host "  - Retention: Last 10 backups kept"
    
    Write-Host "`nTo test the backup now, run:" -ForegroundColor Yellow
    Write-Host "  .\backup-database.ps1" -ForegroundColor White
    
    Write-Host "`nTo view or manage the task:" -ForegroundColor Yellow
    Write-Host "  1. Open 'Task Scheduler' from Start menu"
    Write-Host "  2. Look for 'SchoolPro Daily Backup'" -ForegroundColor White
    
} catch {
    Write-Host "`nError creating scheduled task: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nYou may need to run this script as Administrator." -ForegroundColor Yellow
    Write-Host "Right-click PowerShell and select 'Run as Administrator', then run this script again." -ForegroundColor Yellow
    exit 1
}
