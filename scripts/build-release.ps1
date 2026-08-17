$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$manifestPath = Join-Path $projectRoot "manifest.json"
$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json

if ([string]::IsNullOrWhiteSpace($manifest.version)) {
  throw "manifest.json must contain a version before a release can be created."
}

$releaseItems = @(
  "manifest.json"
  "background.js"
  "content"
  "shared"
  "assets"
  "options.html"
  "options.css"
  "options.js"
  "popup.html"
  "popup.css"
  "popup.js"
)

$packagePaths = foreach ($item in $releaseItems) {
  $path = Join-Path $projectRoot $item
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Required release item is missing: $item"
  }
  $path
}

$releaseDirectory = Join-Path $projectRoot "dist"
New-Item -ItemType Directory -Path $releaseDirectory -Force | Out-Null

$archiveName = "slash-expander-v{0}.zip" -f $manifest.version
$archivePath = Join-Path $releaseDirectory $archiveName

Compress-Archive `
  -LiteralPath $packagePaths `
  -DestinationPath $archivePath `
  -CompressionLevel Optimal `
  -Force

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($archivePath)

try {
  $entries = @($archive.Entries | ForEach-Object { $_.FullName.Replace("\", "/") })

  if ($entries -notcontains "manifest.json") {
    throw "Release validation failed: manifest.json is not at the ZIP root."
  }

  $excludedPattern = '(^|/)(\.git|design|node_modules|scripts|tests)(/|$)|(^|/)(README\.md|package(-lock)?\.json)$'
  $excludedEntries = @($entries | Where-Object { $_ -match $excludedPattern })

  if ($excludedEntries.Count -gt 0) {
    throw "Release validation failed: development files were included: $($excludedEntries -join ', ')"
  }

  $fileCount = @($archive.Entries | Where-Object { -not [string]::IsNullOrEmpty($_.Name) }).Count
}
finally {
  $archive.Dispose()
}

$archiveSize = (Get-Item -LiteralPath $archivePath).Length
$archiveSizeKb = [math]::Round($archiveSize / 1KB, 1)

Write-Host "Created $archivePath"
Write-Host "Validated $fileCount release files ($archiveSizeKb KB); manifest.json is at the ZIP root."
