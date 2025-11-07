$ErrorActionPreference = 'Stop'
$apiBase = 'http://localhost:3000'
$papersDir = Join-Path (Split-Path $PSScriptRoot -Parent) 'data\papers'
if (!(Test-Path $papersDir)) { New-Item -ItemType Directory -Path $papersDir -Force | Out-Null }
$subjects = Invoke-RestMethod -Uri ($apiBase + '/api/subjects') -Method Get
foreach ($s in $subjects) {
  $code = [string]$s.code
  if ([string]::IsNullOrWhiteSpace($code)) { continue }
  $safe = ($code -replace '[^a-zA-Z0-9\-_.]','_')
  $outPath = Join-Path $papersDir ($safe + '.json')
  if (!(Test-Path $outPath)) {
    '[]' | Set-Content -Path $outPath -Encoding utf8
    Write-Host ("Created {0}" -f $outPath)
  } else {
    Write-Host ("Exists  {0} (skipped)" -f $outPath)
  }
}
