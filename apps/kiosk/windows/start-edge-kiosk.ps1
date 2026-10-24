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
if (-not $edge) { throw 'Microsoft Edgeが見つかりません。' }

$python = Get-Command py -ErrorAction SilentlyContinue
if (-not $python) { $python = Get-Command python -ErrorAction SilentlyContinue }
if (-not $python) { throw 'Pythonランチャーが見つかりません。' }

Start-Process -WindowStyle Hidden -FilePath $python.Source -ArgumentList @('-m', 'http.server', $port, '--bind', '127.0.0.1', '--directory', $webRoot)
Start-Sleep -Milliseconds 700
Start-Process -FilePath $edge -ArgumentList @('--kiosk', "http://127.0.0.1:$port/index.html", '--no-first-run', '--disable-session-crashed-bubble')
