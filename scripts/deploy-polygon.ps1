# scripts/deploy-polygon.ps1
# Deploys AgentMesh to Polygon mainnet. The reference deployment lives at
# block 86,676,805 (see docs/mainnet.md). Re-running this redeploys at a
# different address (CREATE2 salt = nonce-based).
#
# Requires:
#   - $env:PRIVATE_KEY_DEPLOYER  funded mainnet key (~3 POL min for gas)
#   - $env:POLYGON_RPC           defaults to publicnode
$ErrorActionPreference = 'Stop'

if (-not $env:PRIVATE_KEY_DEPLOYER) {
    throw "PRIVATE_KEY_DEPLOYER not set. Source .env.deployer or export it first."
}
if (-not $env:POLYGON_RPC) {
    $env:POLYGON_RPC = 'https://polygon-bor-rpc.publicnode.com'
}

$root = Split-Path -Parent $PSScriptRoot
Push-Location (Join-Path $root 'contracts')

Write-Host "Deploying to Polygon MAINNET ($($env:POLYGON_RPC))..." -ForegroundColor Yellow
Write-Host "This costs real POL. Ctrl-C now if unintentional." -ForegroundColor Yellow
Start-Sleep -Seconds 3

$forge = Join-Path $env:USERPROFILE '.foundry\bin\forge.exe'
& $forge script script/Deploy.s.sol:Deploy `
    --rpc-url $env:POLYGON_RPC `
    --broadcast `
    --slow `
    -vv

if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Deploy failed" }

Pop-Location
Write-Host "Done. Addresses written to deployments/polygon.json" -ForegroundColor Green
Write-Host "Verify on Polygonscan: scripts/verify-polygon.ps1" -ForegroundColor Cyan
