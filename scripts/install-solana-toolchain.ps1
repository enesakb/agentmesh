# scripts/install-solana-toolchain.ps1
# One-shot installer: Solana CLI (Anza/Agave) + Anchor framework.
# After running, restart your shell so PATH picks up the new binaries.
# Then run: pnpm run deploy:solana
$ErrorActionPreference = 'Stop'

Write-Host "=== Step 1/3: Solana CLI (Agave) ===" -ForegroundColor Cyan
$releasesRoot = Join-Path $env:USERPROFILE '.local\share\solana\install\releases'
$activeRelease = Join-Path $env:USERPROFILE '.local\share\solana\install\active_release'

# Try to use the symlink-based installer; on Windows without Developer Mode
# / admin, the symlink step fails with error 1314 ("privilege not held").
# We catch that and fall back to a direct PATH wiring against the latest
# downloaded release directory.
$installer = Join-Path $env:TEMP 'solana-install-init.exe'
Invoke-WebRequest `
    -Uri 'https://release.anza.xyz/stable/solana-install-init-x86_64-pc-windows-msvc.exe' `
    -OutFile $installer `
    -UseBasicParsing

& $installer stable 2>&1 | Tee-Object -Variable installLog | Out-Host
$symlinkFailed = ($installLog -match 'os error 1314' -or -not (Test-Path $activeRelease))

if ($symlinkFailed) {
    Write-Host ""
    Write-Host "Symlink step blocked by Windows (no Developer Mode / admin)." -ForegroundColor Yellow
    Write-Host "Falling back to direct PATH wiring." -ForegroundColor Yellow

    if (-not (Test-Path $releasesRoot)) {
        throw "No Solana release found at $releasesRoot — installer didn't download. Re-run."
    }
    $latest = Get-ChildItem $releasesRoot -Directory |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    $solanaBin = Join-Path $latest.FullName 'solana-release\bin'
    if (-not (Test-Path $solanaBin)) {
        $solanaBin = Join-Path $latest.FullName 'bin'
    }
    if (-not (Test-Path (Join-Path $solanaBin 'solana.exe'))) {
        throw "solana.exe not found under $solanaBin — release layout unexpected."
    }
    Write-Host "Using release dir: $solanaBin" -ForegroundColor Green
} else {
    $solanaBin = Join-Path $activeRelease 'bin'
}

# Permanently add to user PATH (so future shells pick it up)
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (-not ($userPath -split ';' -contains $solanaBin)) {
    [Environment]::SetEnvironmentVariable('Path', "$solanaBin;$userPath", 'User')
    Write-Host "Added to user PATH (permanent)." -ForegroundColor Green
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
