# scripts/deploy-multichain.ps1
# Deploys AgentMesh to every funded testnet in turn.
# Reads DEPLOYER_PRIVATE_KEY from .env.deployer.
# Skips a chain if the deployer balance is < 0.05 native token.
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root '.env.deployer'
if (-not (Test-Path $envFile)) {
    throw "Missing .env.deployer. Run scripts/generate-deployer.ps1 first."
}

$envContent = Get-Content $envFile
foreach ($line in $envContent) {
    if ($line -match '^([A-Z_]+)=(.*)$') {
        Set-Variable -Name $Matches[1] -Value $Matches[2].Trim()
    }
}

if (-not $DEPLOYER_PRIVATE_KEY) {
    throw "DEPLOYER_PRIVATE_KEY not loaded"
}

$forge = Join-Path $env:USERPROFILE '.foundry\bin\forge.exe'
$cast = Join-Path $env:USERPROFILE '.foundry\bin\cast.exe'

$chains = @(
    @{ name = 'amoy';            rpc = 'https://rpc-amoy.polygon.technology';        chainId = 80002;    explorer = 'https://amoy.polygonscan.com' },
    @{ name = 'base-sepolia';    rpc = 'https://sepolia.base.org';                   chainId = 84532;    explorer = 'https://sepolia.basescan.org' },
    @{ name = 'arbitrum-sepolia';rpc = 'https://sepolia-rollup.arbitrum.io/rpc';     chainId = 421614;   explorer = 'https://sepolia.arbiscan.io' },
    @{ name = 'optimism-sepolia';rpc = 'https://sepolia.optimism.io';                chainId = 11155420; explorer = 'https://sepolia-optimism.etherscan.io' },
    @{ name = 'sonic-testnet';   rpc = 'https://rpc.testnet.soniclabs.com';          chainId = 64165;    explorer = 'https://testnet.sonicscan.org' }
)

Push-Location (Join-Path $root 'contracts')

$deployed = @()

foreach ($c in $chains) {
    Write-Host ''
    Write-Host "=== $($c.name) (chain $($c.chainId)) ===" -ForegroundColor Cyan

    $balRaw = & $cast balance $DEPLOYER_ADDRESS --rpc-url $c.rpc 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  RPC unreachable, skipping" -ForegroundColor Yellow
        continue
    }
    $balWei = [decimal]$balRaw
    $balEth = $balWei / 1e18
    Write-Host ("  balance: {0:N6}" -f $balEth)

    if ($balWei -lt 50000000000000000) {  # 0.05 ETH
        Write-Host "  insufficient funds, skipping" -ForegroundColor Yellow
        continue
    }

    $env:PRIVATE_KEY_DEPLOYER = $DEPLOYER_PRIVATE_KEY
    & $forge script script/Deploy.s.sol:Deploy `
        --rpc-url $c.rpc `
        --broadcast `
        --slow `
        2>&1 | Select-String -Pattern 'Wrote|REVERT|Error' | Select-Object -Last 3 | Out-Host

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ deployed" -ForegroundColor Green
        $deployed += $c.name
    } else {
        Write-Host "  ✗ failed" -ForegroundColor Red
    }
}

Pop-Location

Write-Host ''
Write-Host "=== summary ===" -ForegroundColor Cyan
Write-Host "deployed to: $($deployed -join ', ')"
Write-Host "addresses recorded in deployments/<chain>.json"
