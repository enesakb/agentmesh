# scripts/run-demo.ps1
# End-to-end AgentMesh demo orchestrator.
#
# 1) Ensure anvil is running on $env:ANVIL_RPC.
# 2) Ensure deployments/anvil.json exists (deploy if not).
# 3) Start demo-alpha (provider) in background. Wait for [alpha-ready] sentinel.
# 4) Run demo-beta (consumer) foreground.
# 5) Print success or failure summary, kill alpha.

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Push-Location $root

# Load .env into process env
$envFile = Join-Path $root '.env'
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$') {
            $name = $Matches[1]; $value = $Matches[2].Trim()
            # Strip surrounding quotes
            if ($value.StartsWith('"') -and $value.EndsWith('"')) { $value = $value.Substring(1, $value.Length - 2) }
            [Environment]::SetEnvironmentVariable($name, $value, 'Process')
        }
    }
}

if (-not $env:ANVIL_RPC) { $env:ANVIL_RPC = 'http://127.0.0.1:8545' }
if (-not $env:AGENTMESH_CHAIN) { $env:AGENTMESH_CHAIN = 'anvil' }

# Step 1: Anvil
function Test-Anvil {
    try {
        $r = Invoke-RestMethod -Uri $env:ANVIL_RPC -Method Post -ContentType 'application/json' `
            -Body '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' -TimeoutSec 2
        return ($r.result -ne $null)
    } catch { return $false }
}

$anvilProc = $null
if (-not (Test-Anvil)) {
    Write-Host '[orch] starting anvil...' -ForegroundColor Cyan
    $anvilExe = Join-Path $env:USERPROFILE '.foundry\bin\anvil.exe'
    $anvilProc = Start-Process -FilePath $anvilExe `
        -ArgumentList @('--host','127.0.0.1','--chain-id','31337','--block-time','1','--silent') `
        -RedirectStandardOutput 'C:\tmp\anvil.log' -RedirectStandardError 'C:\tmp\anvil.err' `
        -PassThru -WindowStyle Hidden
    Start-Sleep -Seconds 2
    if (-not (Test-Anvil)) { throw 'anvil did not come up' }
} else {
    Write-Host '[orch] anvil already running' -ForegroundColor DarkGray
}

# Step 2: Deployment
$deployment = Join-Path $root 'deployments\anvil.json'
if (-not (Test-Path $deployment)) {
    Write-Host '[orch] deploying contracts...' -ForegroundColor Cyan
    & (Join-Path $root 'scripts\deploy-local.ps1')
}
Write-Host "[orch] using deployment: $deployment" -ForegroundColor DarkGray

# Step 3: Demo-alpha in background
$alphaLog = 'C:\tmp\agentmesh-alpha.log'
$alphaErr = 'C:\tmp\agentmesh-alpha.err'
if (Test-Path $alphaLog) { Remove-Item $alphaLog -Force }
if (Test-Path $alphaErr) { Remove-Item $alphaErr -Force }

$alphaProc = $null
$readyDeadline = (Get-Date).AddSeconds(60)
try {
    Write-Host '[orch] starting demo-alpha...' -ForegroundColor Cyan
    # pnpm is a .cmd shim; Start-Process needs an actual exe → use cmd.exe.
    $alphaProc = Start-Process -FilePath 'cmd.exe' `
        -ArgumentList @('/c','pnpm --filter @agentmesh/demo-alpha start') `
        -WorkingDirectory $root `
        -RedirectStandardOutput $alphaLog `
        -RedirectStandardError $alphaErr `
        -PassThru -WindowStyle Hidden

    while ((Get-Date) -lt $readyDeadline) {
        if (Test-Path $alphaLog) {
            $found = Select-String -Path $alphaLog -Pattern '[alpha-ready]' -SimpleMatch -ErrorAction SilentlyContinue
            if ($found) {
                Write-Host "[orch] alpha ready: $($found.Line)" -ForegroundColor Green
                break
            }
        }
        if ($alphaProc.HasExited) {
            Write-Host '[orch] alpha exited unexpectedly' -ForegroundColor Red
            Get-Content $alphaErr -ErrorAction SilentlyContinue | Write-Host
            Get-Content $alphaLog -ErrorAction SilentlyContinue | Write-Host
            throw 'alpha failed to start'
        }
        Start-Sleep -Milliseconds 500
    }
    if ((Get-Date) -ge $readyDeadline) {
        Get-Content $alphaErr -ErrorAction SilentlyContinue | Write-Host
        Get-Content $alphaLog -ErrorAction SilentlyContinue | Write-Host
        throw 'alpha did not signal ready in 60s'
    }

    # Step 4: Beta foreground
    Write-Host '[orch] running demo-beta...' -ForegroundColor Cyan
    & pnpm --filter '@agentmesh/demo-beta' start
    $betaExit = $LASTEXITCODE

    if ($betaExit -ne 0) { throw "beta exited $betaExit" }
} finally {
    if ($alphaProc -and -not $alphaProc.HasExited) {
        Write-Host '[orch] stopping alpha (tree)' -ForegroundColor DarkGray
        # cmd.exe spawns pnpm → node; only a tree-kill reaches the leaf.
        & taskkill /F /T /PID $alphaProc.Id 2>&1 | Out-Null
    }
    # Belt-and-suspenders: anything still bound to the alpha port must go.
    $alphaPort = if ($env:ALPHA_PORT) { [int]$env:ALPHA_PORT } else { 4001 }
    $stale = Get-NetTCPConnection -LocalPort $alphaPort -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($stale) { & taskkill /F /T /PID $stale.OwningProcess 2>&1 | Out-Null }
    Pop-Location
}

Write-Host ''
Write-Host '🎉 demo passed' -ForegroundColor Green
