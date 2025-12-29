# Quick script to update DB password
# Usage: Run this script and enter your new password when prompted

$envFile = "D:\Personal\Biz\.env"
$securePassword = Read-Host "Enter your new SQL Server password" -AsSecureString
$password = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))

Write-Host "Updating .env file..." -ForegroundColor Yellow

$content = Get-Content $envFile
$updated = $false
$newContent = $content | ForEach-Object {
    if ($_ -match '^DB_PASSWORD=') {
        $updated = $true
        "DB_PASSWORD=$password"
    } else {
        $_
    }
}

if ($updated) {
    $newContent | Set-Content $envFile
    Write-Host "✅ Password updated in .env file!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  Now restart your server: Stop it (Ctrl+C) and run: npm run dev" -ForegroundColor Yellow
} else {
    Write-Host "❌ DB_PASSWORD line not found in .env file" -ForegroundColor Red
}
