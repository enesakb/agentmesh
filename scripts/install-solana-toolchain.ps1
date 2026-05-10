# scripts/install-solana-toolchain.ps1
# One-shot installer: Solana CLI (Anza/Agave) + Anchor framework.
# After running, restart your shell so PATH picks up the new binaries.
# Then run: pnpm run deploy:solana
$ErrorActionPreference = 'Stop'

Write-Host "=== Step 1/3: Solana CLI (Agave) ===" -ForegroundColor Cyan
$installer = Join-Path $env:TEMP 'solana-install-init.exe'
Invoke-WebRequest `
    -Uri 'https://release.anza.xyz/stable/solana-install-init-x86_64-pc-windows-msvc.exe' `
    -OutFile $installer `
    -UseBasicParsing
& $installer stable
if ($LASTEXITCODE -ne 0) { throw "Solana install failed" }

# Add to current-session PATH so we can keep going
$solanaBin = Join-Path $env:LOCALAPPDATA 'solana\install\active_release\bin'
if (-not (Test-Path $solanaBin)) {
    $solanaBin = Join-Path $env:USERPROFILE '.local\share\solana\install\active_release\bin'
}
$env:Path = "$solanaBin;$env:Path"

Write-Host ""
Write-Host "=== Step 2/3: Anchor (via avm) ===" -ForegroundColor Cyan
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
if ($LASTEXITCODE -ne 0) { throw "avm install failed" }
avm install latest
avm use latest

Write-Host ""
Write-Host "=== Step 3/3: Configure Solana to Devnet + airdrop ===" -ForegroundColor Cyan
solana config set --url devnet
if (-not (Test-Path "$env:USERPROFILE\.config\solana\id.json")) {
    Write-Host "Generating fresh keypair (id.json)..." -ForegroundColor Yellow
    solana-keygen new --no-bip39-passphrase --outfile "$env:USERPROFILE\.config\solana\id.json"
}
solana airdrop 2

Write-Host ""
Write-Host "DONE. Restart shell, then: pnpm run deploy:solana" -ForegroundColor Green
solana --version
anchor --version
solana balance
