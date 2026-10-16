$ErrorActionPreference = "Stop"
$repo = "Agbabina/DevPilot"
$asset = "https://github.com/$repo/releases/latest/download/devpilot-windows-amd64.exe"
$installDir = Join-Path $env:LOCALAPPDATA "DevPilot\bin"
$binary = Join-Path $installDir "devpilot.exe"
New-Item -ItemType Directory -Force -Path $installDir | Out-Null
Write-Host "Installing DevPilot CLI..." -ForegroundColor Cyan
$installed = $false
try { Invoke-WebRequest -Uri $asset -OutFile $binary; $installed = (Test-Path $binary) -and ((Get-Item $binary).Length -gt 0) } catch { Write-Host "No release binary yet; trying a source build." -ForegroundColor Yellow }
if (-not $installed) {
  if (-not (Get-Command go -ErrorAction SilentlyContinue)) { throw "No release binary is available yet and Go is missing. Install Go 1.25.7+ from https://go.dev/dl/ or use https://github.com/$repo/releases." }
  $temp = Join-Path ([IO.Path]::GetTempPath()) ("devpilot-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $temp | Out-Null
  try {
    $zip = Join-Path $temp "source.zip"
    Invoke-WebRequest -Uri "https://github.com/$repo/archive/refs/heads/feature/devpilot-git-inspection.zip" -OutFile $zip
    Expand-Archive -Path $zip -DestinationPath $temp -Force
    $root = Get-ChildItem $temp -Directory | Where-Object { Test-Path (Join-Path $_.FullName "cli\go.mod") } | Select-Object -First 1
    if (-not $root) { throw "Could not find the CLI source folder." }
    Push-Location (Join-Path $root.FullName "cli")
    try { go build -trimpath -o $binary . } finally { Pop-Location }
  } finally { Remove-Item -Recurse -Force $temp -ErrorAction SilentlyContinue }
}
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$entries = @($userPath -split ";" | Where-Object { $_ })
if ($entries -notcontains $installDir) { [Environment]::SetEnvironmentVariable("Path", (($entries + $installDir) -join ";"), "User") }
$env:Path = "$installDir;$env:Path"
Write-Host "DevPilot installed to $binary" -ForegroundColor Green
Write-Host "Try: devpilot help"
Write-Host "If a new terminal cannot find devpilot, close and reopen PowerShell."
