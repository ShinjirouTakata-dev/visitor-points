$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$webRoot = Join-Path $projectRoot 'web'
$port = 5173
$edgeCandidates = @(
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:LocalAppData\Microsoft\Edge\Application\msedge.exe"
)
$edge = $edgeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $edge) { throw 'Microsoft Edge executable was not found.' }

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw 'Node.js was not found. Install Node.js and retry.' }
$serverScript = Join-Path $PSScriptRoot '..\scripts\serve-web.mjs'
$server = Start-Process -WindowStyle Hidden -PassThru -FilePath $node.Source -ArgumentList @($serverScript, '--port', $port, '--directory', $webRoot)
Start-Sleep -Milliseconds 700
try { Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/index.html" -TimeoutSec 3 | Out-Null }
catch { if ($server.HasExited) { throw "Web server failed to start. ExitCode=$($server.ExitCode)" }; throw }
Start-Process -FilePath $edge -ArgumentList @('--kiosk', "http://127.0.0.1:$port/index.html", '--no-first-run', '--disable-session-crashed-bubble')
