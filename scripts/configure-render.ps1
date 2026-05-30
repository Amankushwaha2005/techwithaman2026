# One-time Render setup — needs API key from https://dashboard.render.com/u/settings#api-keys
# Usage: $env:RENDER_API_KEY="rnd_xxx"; .\scripts\configure-render.ps1

param(
  [string]$ServiceName = "techwithaman-website"
)

$ErrorActionPreference = "Stop"
$apiKey = $env:RENDER_API_KEY
if (-not $apiKey) {
  Write-Host "Set RENDER_API_KEY first (Render Dashboard -> Account -> API Keys)"
  exit 1
}

$headers = @{
  Authorization = "Bearer $apiKey"
  Accept        = "application/json"
  "Content-Type" = "application/json"
}

Write-Host "Finding service $ServiceName ..."
$services = Invoke-RestMethod -Uri "https://api.render.com/v1/services?limit=50" -Headers $headers
$match = $services | ForEach-Object { $_.service } | Where-Object { $_.name -eq $ServiceName } | Select-Object -First 1
if (-not $match) {
  Write-Host "Service not found. Available:"
  $services | ForEach-Object { $_.service.name }
  exit 1
}

$serviceId = $match.id
Write-Host "Service ID: $serviceId"

# Load .env from project root
$envPath = Join-Path $PSScriptRoot ".." ".env"
$dotenv = @{}
if (Test-Path $envPath) {
  Get-Content $envPath | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
      $dotenv[$matches[1].Trim()] = $matches[2].Trim()
    }
  }
}

$baseUrl = "https://techwithaman-website.onrender.com"
$payload = @(
  @{ key = "BASE_URL"; value = $baseUrl }
  @{ key = "PAYMENT_ADVANCE_PERCENT"; value = "50" }
  @{ key = "NODE_ENV"; value = "production" }
  @{ key = "PGSSL"; value = "true" }
  @{ key = "RAZORPAY_KEY_ID"; value = $dotenv["RAZORPAY_KEY_ID"] }
  @{ key = "RAZORPAY_KEY_SECRET"; value = $dotenv["RAZORPAY_KEY_SECRET"] }
) | Where-Object { $_.value }

if ($dotenv["DATABASE_URL"]) {
  $payload += @{ key = "DATABASE_URL"; value = $dotenv["DATABASE_URL"] }
}

$body = @{ envVars = $payload } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method Put -Uri "https://api.render.com/v1/services/$serviceId/env-vars" -Headers $headers -Body $body | Out-Null
Write-Host "Environment variables updated."

Write-Host "Triggering deploy ..."
Invoke-RestMethod -Method Post -Uri "https://api.render.com/v1/services/$serviceId/deploys" -Headers $headers -Body "{}" | Out-Null
Write-Host "Deploy started. Wait 3-5 min then open: $baseUrl/api/site-info"
