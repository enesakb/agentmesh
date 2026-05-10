# scripts/verify-polygon.ps1
# Verifies all 7 mainnet contracts on Polygonscan. Source code becomes
# publicly browsable + the green "Contract" tick appears.
#
# Requires:
#   - $env:POLYGONSCAN_API_KEY  (free tier — https://polygonscan.com/myapikey)
$ErrorActionPreference = 'Stop'

if (-not $env:POLYGONSCAN_API_KEY) {
    throw "POLYGONSCAN_API_KEY not set. Get one at https://polygonscan.com/myapikey"
}

$root = Split-Path -Parent $PSScriptRoot
Push-Location (Join-Path $root 'contracts')

$forge = Join-Path $env:USERPROFILE '.foundry\bin\forge.exe'

$contracts = @(
    @{ addr = '0x24A8188FC9dFc5B959Aac1CF8cC3b0fF2287F723'; path = 'src/reputation/ReputationRegistry.sol:ReputationRegistry'; constructorArgs = '0xfC4C97d11202Ab6E14f253DD42186644f6776EA7' },
    @{ addr = '0x5bdE393FD887CFca59EaFdfc2b8A1490142ec8a5'; path = 'src/identity/AgentRegistry.sol:AgentRegistry';                constructorArgs = '' },
    @{ addr = '0xAdDCb6F4438BBf341D44a59744191b24FBD2703B'; path = 'src/wallet/AgentAccount.sol:AgentAccount';                  constructorArgs = '' },
    @{ addr = '0x7f0029477D37E459A38D98d6dBb611ff88A61947'; path = 'src/wallet/AgentAccountFactory.sol:AgentAccountFactory';   constructorArgs = '0xAdDCb6F4438BBf341D44a59744191b24FBD2703B' },
    @{ addr = '0x4b6E2A371B026FA1483e2faeaBAF826F9ee21B7F'; path = 'src/wallet/modules/SpendingPolicyModule.sol:SpendingPolicyModule'; constructorArgs = '' },
    @{ addr = '0x70F9D229B37B88a986ffc7CA7381E08Ad47264cC'; path = 'src/wallet/modules/RecoveryModule.sol:RecoveryModule';     constructorArgs = '' },
    @{ addr = '0xec1D1998955D83e62058d2C2650f6CC73637C63a'; path = 'src/marketplace/ServiceMarketplace.sol:ServiceMarketplace'; constructorArgs = '0x24A8188FC9dFc5B959Aac1CF8cC3b0fF2287F723' }
)

foreach ($c in $contracts) {
    Write-Host "Verifying $($c.path) at $($c.addr)..." -ForegroundColor Cyan
    $args = @(
        'verify-contract', $c.addr, $c.path,
        '--chain-id', '137',
        '--etherscan-api-key', $env:POLYGONSCAN_API_KEY,
        '--watch'
    )
    if ($c.constructorArgs) {
        $encoded = & (Join-Path $env:USERPROFILE '.foundry\bin\cast.exe') abi-encode "constructor(address)" $c.constructorArgs
        $args += '--constructor-args'
        $args += $encoded
    }
    & $forge @args
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Verification of $($c.path) failed (continuing)" -ForegroundColor Yellow
    }
}

Pop-Location
Write-Host "Verification pass complete. Check Polygonscan for green ticks." -ForegroundColor Green
