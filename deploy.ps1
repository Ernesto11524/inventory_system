# StockFlow Deploy Script
# Usage:
#   .\deploy.ps1                  — push current changes and deploy to server
#   .\deploy.ps1 -message "msg"   — push with a specific commit message
#   .\deploy.ps1 -serverOnly      — deploy to server without pushing (use last GitHub commit)

param(
    [string]$message = "",
    [switch]$serverOnly
)

$SERVER = "root@76.13.1.67"
$ErrorActionPreference = "Stop"

function Write-Step($text) {
    Write-Host ""
    Write-Host ">> $text" -ForegroundColor Cyan
}

function Write-OK($text) {
    Write-Host "   $text" -ForegroundColor Green
}

function Write-Fail($text) {
    Write-Host "   ERROR: $text" -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Yellow
Write-Host "  StockFlow Deploy" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Yellow

Set-Location $PSScriptRoot

if (-not $serverOnly) {
    # Check for uncommitted changes
    $status = git status --porcelain
    if ($status) {
        Write-Step "Staging and committing changes..."
        git add -A
        if ($message -eq "") {
            $message = Read-Host "   Commit message"
        }
        git commit -m $message
        Write-OK "Committed: $message"
    } else {
        Write-Step "No local changes to commit"
    }

    Write-Step "Pushing to GitHub..."
    git push origin main
    Write-OK "Pushed to GitHub"
}

Write-Step "Deploying on server (76.13.1.67)..."
Write-Host "   (this takes ~30-60 seconds)" -ForegroundColor Gray

ssh -o StrictHostKeyChecking=no $SERVER "bash /var/www/inventory/deploy.sh"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  Done! Visit: http://76.13.1.67" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
