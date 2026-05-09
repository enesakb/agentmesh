# scripts/deploy-local.ps1
# Deploys AgentMesh to a local anvil node. Assumes anvil is running on $env:ANVIL_RPC.
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Push-Location (Join-Path $root 'contracts')

if (-not $env:ANVIL_RPC) { $env:ANVIL_RPC = 'http://127.0.0.1:8545' }
if (-not $env:PRIVATE_KEY_DEPLOYER) {
    # Foundry's well-known default Anvil test mnemonic. Public knowledge,
    # documented in Foundry repo, used by every local-anvil developer. NOT a
    # secret — only safe on localhost:8545 (Anvil chain id 31337). Never use
    # this key on any non-test chain.
    $env:PRIVATE_KEY_DEPLOYER = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
}

Write-Host "Deploying AgentMesh to anvil at $($env:ANVIL_RPC)..." -ForegroundColor Cyan

$forge = Join-Path $env:USERPROFILE '.foundry\bin\forge.exe'
& $forge script script/Deploy.s.sol:Deploy `
    --rpc-url $env:ANVIL_RPC `
    --broadcast `
    --skip-simulation `
    --slow `
    -vv

if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Deploy failed" }

Pop-Location
Write-Host "Done. Addresses written to deployments/anvil.json" -ForegroundColor Green
