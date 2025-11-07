# Database Backup Script for SchoolPro
# Run this script regularly to backup your database

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = ".\backups"
$backupFile = "$backupDir\schoolpro_$timestamp.sql"

# Create backups directory if it doesn't exist
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

Write-Host "Creating database backup..." -ForegroundColor Cyan

# Create MySQL dump
docker exec schoolpro-mysql mysqldump -uschooluser -pschoolpass schoolpro > $backupFile

if ($LASTEXITCODE -eq 0) {
    $fileSize = (Get-Item $backupFile).Length / 1KB
    $fileSizeRounded = [math]::Round($fileSize, 2)
    Write-Host "Backup created successfully: $backupFile ($fileSizeRounded KB)" -ForegroundColor Green
    
    # Keep only last 10 backups
    Get-ChildItem $backupDir -Filter "schoolpro_*.sql" | 
        Sort-Object LastWriteTime -Descending | 
        Select-Object -Skip 10 | 
        Remove-Item -Force
    
    Write-Host "Old backups cleaned up (keeping latest 10)" -ForegroundColor Green
} else {
    Write-Host "Backup failed!" -ForegroundColor Red
    exit 1
}
