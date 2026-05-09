# scripts/stress.ps1
# Runs the demo orchestrator N times in a row against a fresh anvil.
# Reports success rate and per-run duration.
$ErrorActionPreference = 'Stop'
$N = if ($args[0]) { [int]$args[0] } else { 10 }

$root = Split-Path -Parent $PSScriptRoot
$results = [System.Collections.Generic.List[object]]::new()
$ok = 0
$fail = 0

Write-Host "=== AgentMesh demo stress test ===" -ForegroundColor Cyan
Write-Host "  runs : $N" -ForegroundColor DarkGray

for ($i = 1; $i -le $N; $i++) {
    $start = Get-Date
    $proc = Start-Process -FilePath 'pwsh' `
        -ArgumentList @('-NoProfile','-File',(Join-Path $root 'scripts\run-demo.ps1')) `
        -RedirectStandardOutput "C:\tmp\agentmesh-stress-$i.out" `
        -RedirectStandardError  "C:\tmp\agentmesh-stress-$i.err" `
        -PassThru -WindowStyle Hidden -Wait
    $duration = ((Get-Date) - $start).TotalSeconds
    $passed = $proc.ExitCode -eq 0
    if ($passed) { $ok++ } else { $fail++ }
    $results.Add(@{ run = $i; ok = $passed; sec = [math]::Round($duration, 2) })
    Write-Host ("  run {0,2}: {1} in {2,5:N2}s" -f $i, ($(if ($passed) { 'OK  ' } else { 'FAIL' })), $duration) `
        -ForegroundColor $(if ($passed) { 'Green' } else { 'Red' })
}

$avg = ($results.sec | Measure-Object -Average).Average
Write-Host ''
Write-Host "=== summary ===" -ForegroundColor Cyan
Write-Host "  passed     : $ok / $N"
Write-Host "  failed     : $fail"
Write-Host ("  avg time   : {0:N2}s" -f $avg)

$json = $results | ConvertTo-Json -Compress
$json | Out-File -Encoding utf8 (Join-Path $root 'docs\stress-results.json')
Write-Host "  written    : docs/stress-results.json" -ForegroundColor DarkGray
