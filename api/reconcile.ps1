# PowerShell script to reconcile invoices for student TXS9743842
# Run this from PowerShell: .\reconcile.ps1 YOUR_ADMIN_TOKEN

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

Write-Host "🔄 Reconciling invoices for student TXS9743842..." -ForegroundColor Cyan
Write-Host ""

try {
    $headers = @{
        "Authorization" = "Bearer $Token"
        "Content-Type" = "application/json"
    }
    
    $body = @{
        term = "Term 1"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/accounts/reconcile/TXS9743842" `
        -Method POST `
        -Headers $headers `
        -Body $body
    
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 3
    Write-Host ""
    
    if ($response.settled -gt 0) {
        Write-Host "🎉 Settled $($response.settled) invoice(s)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Refresh the parent portal invoice page"
        Write-Host "2. Invoices should now show 'paid' status"
        Write-Host "3. Try clicking 'Open Report' - should work now!"
    }
    
} catch {
    Write-Host "❌ ERROR!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Message: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "Token is invalid or expired. Get a new admin token:" -ForegroundColor Yellow
        Write-Host "1. Open app in browser and press F12"
        Write-Host "2. Go to Application → Local Storage"
        Write-Host "3. Copy the value of 'access_token'"
        Write-Host "4. Run: .\reconcile.ps1 NEW_TOKEN"
    } elseif ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Host "User is not an admin. Make sure you're using an admin account token." -ForegroundColor Yellow
    } else {
        Write-Host "Make sure backend is running at http://localhost:3000" -ForegroundColor Yellow
    }
}
