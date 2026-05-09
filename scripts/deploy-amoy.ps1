# scripts/deploy-amoy.ps1
# Deploys AgentMesh to Polygon Amoy. Requires:
#   - $env:PRIVATE_KEY_DEPLOYER set to a funded testnet key
#   - $env:POLYGON_AMOY_RPC (defaults to public Polygon RPC)
$ErrorActionPreference = 'Stop'

if (-not $env:PRIVATE_KEY_DEPLOYER) {
    throw "PRIVATE_KEY_DEPLOYER not set. Source .env or export it first."
}
if (-not $env:POLYGON_AMOY_RPC) {
    $env:POLYGON_AMOY_RPC = 'https://rpc-amoy.polygon.technology'
}

$root = Split-Path -Parent $PSScriptRoot
Push-Location (Join-Path $root 'contracts')

Write-Host "Deploying to Polygon Amoy ($($env:POLYGON_AMOY_RPC))..." -ForegroundColor Cyan

$forge = Join-Path $env:USERPROFILE '.foundry\bin\forge.exe'
& $forge script script/Deploy.s.sol:Deploy `
    --rpc-url $env:POLYGON_AMOY_RPC `
    --broadcast `
    --slow `
    -vv

if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Deploy failed" }

Pop-Location
Write-Host "Done. Addresses written to deployments/amoy.json" -ForegroundColor Green
Write-Host "Faucet (if low on MATIC): https://faucet.polygon.technology" -ForegroundColor Yellow
