# PowerShell script to start BizEase UAE Application

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Starting BizEase UAE Application" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Starting Backend Server..." -ForegroundColor Yellow
$serverScript = "cd '$PSScriptRoot\server'; if (Test-Path package.json) { npm run dev } else { Write-Host 'Error: server/package.json not found'; pause }"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $serverScript -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "Starting Frontend Client..." -ForegroundColor Yellow
$clientScript = "cd '$PSScriptRoot\client'; if (Test-Path package.json) { npm start } else { Write-Host 'Error: client/package.json not found'; pause }"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $clientScript -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Application is starting..." -ForegroundColor Green
Write-Host " Server: http://localhost:5004" -ForegroundColor Green
Write-Host " Client: http://localhost:3000" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Two new terminal windows have opened." -ForegroundColor White
Write-Host "Close those windows to stop the servers." -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to exit"

