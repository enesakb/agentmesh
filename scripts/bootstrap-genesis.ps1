# scripts/bootstrap-genesis.ps1
# Registers the deployer EOA as the first agent on mainnet — proves the
# system is alive end-to-end. One-shot: agentmesh-genesis, capability
# data.weather.
#
# After running, anyone can query:
#   cast call <AgentRegistry> "findByCapability(bytes32)(address[])" <hash>
# and see the deployer EOA show up.
#
# Requires:
#   - $env:PRIVATE_KEY_DEPLOYER  same key that deployed the contracts
$ErrorActionPreference = 'Stop'

if (-not $env:PRIVATE_KEY_DEPLOYER) {
    throw "PRIVATE_KEY_DEPLOYER not set. Source .env.deployer first."
}
if (-not $env:POLYGON_RPC) {
    $env:POLYGON_RPC = 'https://polygon-bor-rpc.publicnode.com'
}

$registry        = '0x5bdE393FD887CFca59EaFdfc2b8A1490142ec8a5'
$weatherCapHash  = '0x0371f5d5e8967b379b9196fa41a86bf5550bb4c3c61ccc96bbd1d4c328b9c3b4'

$cast = Join-Path $env:USERPROFILE '.foundry\bin\cast.exe'

Write-Host "Registering 'agentmesh-genesis' on Polygon mainnet..." -ForegroundColor Cyan
& $cast send $registry `
    "register(string,string,bytes32[])" `
    "agentmesh-genesis" `
    "ipfs://bafyAgentMeshGenesis001" `
    "[$weatherCapHash]" `
    --rpc-url $env:POLYGON_RPC `
    --private-key $env:PRIVATE_KEY_DEPLOYER

if ($LASTEXITCODE -ne 0) { throw "Register failed" }

Write-Host "Done. Verify with:" -ForegroundColor Green
Write-Host "  cast call $registry 'findByCapability(bytes32)(address[])' $weatherCapHash --rpc-url `$env:POLYGON_RPC" -ForegroundColor Cyan
