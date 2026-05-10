# scripts/deploy-solana.ps1
# Builds + deploys the Anchor program in programs/agentmesh to whatever
# cluster Solana CLI is currently set to (defaults to devnet).
#
# Pre-reqs: scripts/install-solana-toolchain.ps1 ran successfully and the
# wallet has airdropped SOL on devnet.
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Push-Location $root

Write-Host "Cluster:" -ForegroundColor Cyan
solana config get | Select-String 'RPC URL'

Write-Host "Balance:" -ForegroundColor Cyan
solana balance

Write-Host ""
Write-Host "=== anchor build ===" -ForegroundColor Cyan
anchor build
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "anchor build failed" }

# After build, replace the placeholder declare_id with the real one
$keypairPath = Join-Path $root 'target/deploy/agentmesh-keypair.json'
if (-not (Test-Path $keypairPath)) {
    Pop-Location
    throw "Expected $keypairPath after anchor build"
}
$realProgramId = (solana-keygen pubkey $keypairPath).Trim()
Write-Host "Program ID: $realProgramId" -ForegroundColor Green

# Patch declare_id! and Anchor.toml if they still point at the placeholder
$libPath = Join-Path $root 'programs/agentmesh/src/lib.rs'
$libContent = Get-Content $libPath -Raw
if ($libContent -match 'AGmEsHmEsH1111111111111111111111111111111111') {
    $libContent = $libContent -replace 'AGmEsHmEsH1111111111111111111111111111111111', $realProgramId
    Set-Content -Path $libPath -Value $libContent -NoNewline
    Write-Host "Patched programs/agentmesh/src/lib.rs declare_id! → $realProgramId" -ForegroundColor Yellow
    anchor build
}

$anchorTomlPath = Join-Path $root 'Anchor.toml'
if (Test-Path $anchorTomlPath) {
    $anchorTomlContent = Get-Content $anchorTomlPath -Raw
    if ($anchorTomlContent -match 'AGmEsHmEsH1111111111111111111111111111111111') {
        $anchorTomlContent = $anchorTomlContent -replace 'AGmEsHmEsH1111111111111111111111111111111111', $realProgramId
        Set-Content -Path $anchorTomlPath -Value $anchorTomlContent -NoNewline
        Write-Host "Patched Anchor.toml" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== anchor deploy ===" -ForegroundColor Cyan
anchor deploy

Write-Host ""
Write-Host "Solana deployment complete. Program: $realProgramId" -ForegroundColor Green
Write-Host "Explorer: https://explorer.solana.com/address/$realProgramId?cluster=devnet" -ForegroundColor Cyan

Pop-Location
