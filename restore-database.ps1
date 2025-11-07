# Database Restore Script for SchoolPro
# Use this script to restore from a backup

param(
    [Parameter(Mandatory=$false)]
    [string]$BackupFile
)

if (-not $BackupFile) {
    Write-Host "Available backups:" -ForegroundColor Cyan
    Get-ChildItem ".\backups" -Filter "schoolpro_*.sql" | 
        Sort-Object LastWriteTime -Descending | 
        ForEach-Object { 
            $size = [math]::Round($_.Length / 1KB, 2)
            Write-Host "  - $($_.Name) ($size KB) - $($_.LastWriteTime)"
        }
    
    $BackupFile = Read-Host "`nEnter the backup filename to restore (or full path)"
}

if (-not (Test-Path $BackupFile)) {
    if (-not $BackupFile.Contains("\") -and -not $BackupFile.Contains("/")) {
        $BackupFile = ".\backups\$BackupFile"
    }
}

if (-not (Test-Path $BackupFile)) {
    Write-Host "✗ Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

Write-Host "`nWARNING: This will REPLACE all current database data!" -ForegroundColor Yellow
$confirm = Read-Host "Are you sure you want to restore? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "Restore cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host "Restoring database from $BackupFile..." -ForegroundColor Cyan

# Restore the database
Get-Content $BackupFile | docker exec -i schoolpro-mysql mysql -uschooluser -pschoolpass schoolpro

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Database restored successfully!" -ForegroundColor Green
} else {
    Write-Host "✗ Restore failed!" -ForegroundColor Red
    exit 1
}
