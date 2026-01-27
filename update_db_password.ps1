# Script to update SQL Server password in .env file
# Usage: .\update_db_password.ps1 "your_new_password"

param(
    [Parameter(Mandatory=$true)]
    [string]$NewPassword
)

$envFile = "D:\Personal\Biz\.env"

if (-not (Test-Path $envFile)) {
    Write-Host "❌ .env file not found at: $envFile" -ForegroundColor Red
    exit 1
}

# Read the current .env file
$content = Get-Content $envFile

# Update DB_PASSWORD line
$updated = $false
$newContent = $content | ForEach-Object {
    if ($_ -match '^DB_PASSWORD=') {
        $updated = $true
        "DB_PASSWORD=$NewPassword"
    } else {
        $_
    }
}

if ($updated) {
    # Backup the original file
    $backupFile = "$envFile.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item $envFile $backupFile
    Write-Host "✅ Created backup: $backupFile" -ForegroundColor Green
    
    # Write the updated content
    $newContent | Set-Content $envFile
    Write-Host "✅ Updated DB_PASSWORD in .env file" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Restart your server for the changes to take effect!" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  DB_PASSWORD line not found. Adding it..." -ForegroundColor Yellow
    # Add DB_PASSWORD if it doesn't exist
    Add-Content $envFile "`nDB_PASSWORD=$NewPassword"
    Write-Host "✅ Added DB_PASSWORD to .env file" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Restart your server for the changes to take effect!" -ForegroundColor Yellow
}
