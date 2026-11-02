param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference = 'Stop'
$workspacePath = [System.IO.Path]::GetFullPath($ProjectRoot)
$portablePath = Join-Path $workspacePath 'dist\ImageScanner-1.0.0-portable.exe'
$referenceAsar = Join-Path $workspacePath 'dist\win-unpacked\resources\app.asar'
$expectedHash = (Get-FileHash -LiteralPath $referenceAsar -Algorithm SHA256).Hash
$testPath = Join-Path $workspacePath ('.test-data\portable-boot-' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())
New-Item -ItemType Directory -Path $testPath -Force | Out-Null
$previousMode = $env:NODE_ENV
$previousData = $env:IMAGESCANNER_DATA_DIR
$launcher = $null
$childApp = $null
try {
  $env:NODE_ENV = 'test'
  $env:IMAGESCANNER_DATA_DIR = $testPath
  $launcher = Start-Process -FilePath $portablePath -WindowStyle Hidden -PassThru
  $watch = [System.Diagnostics.Stopwatch]::StartNew()
  while ($watch.Elapsed.TotalSeconds -lt 50) {
    $candidates = Get-CimInstance Win32_Process -Filter "Name='ImageScanner.exe'" | Where-Object { $_.ParentProcessId -eq $launcher.Id }
    foreach ($candidate in $candidates) {
      $running = Get-Process -Id $candidate.ProcessId -ErrorAction SilentlyContinue
      if ($running -and $running.MainWindowHandle -ne 0 -and $running.MainWindowTitle.StartsWith('ImageScanner')) {
        $childApp = $running
        $actualAsar = Join-Path (Split-Path -Parent $candidate.ExecutablePath) 'resources\app.asar'
        break
      }
    }
    if ($childApp) { break }
    if ($launcher.HasExited) { throw 'Taşınabilir başlatıcı pencere açmadan kapandı.' }
    Start-Sleep -Milliseconds 250
  }
  if (-not $childApp) { throw 'Taşınabilir uygulama 50 saniye içinde açılmadı.' }
  $actualHash = (Get-FileHash -LiteralPath $actualAsar -Algorithm SHA256).Hash
  if ($actualHash -ne $expectedHash) { throw 'Taşınabilir uygulamanın içeriği doğrulanan paketle aynı değil.' }
  $report = [ordered]@{
    passed = $true
    checkedAt = [DateTimeOffset]::UtcNow.ToString('o')
    windowTitle = $childApp.MainWindowTitle
    payloadSha256 = $actualHash.ToLowerInvariant()
    launcherSha256 = (Get-FileHash -LiteralPath $portablePath -Algorithm SHA256).Hash.ToLowerInvariant()
    launchSeconds = [Math]::Round($watch.Elapsed.TotalSeconds, 2)
    isolatedData = $true
  }
  $reportPath = Join-Path $workspacePath 'artifacts\portable-boot-verification.json'
  $report | ConvertTo-Json | Set-Content -LiteralPath $reportPath -Encoding utf8
  Write-Output 'Taşınabilir EXE açıldı; pencere ve paket içeriğinin SHA-256 değeri doğrulandı.'
} finally {
  if ($childApp -and -not $childApp.HasExited) {
    $null = $childApp.CloseMainWindow()
    if (-not $childApp.WaitForExit(15000)) { throw 'Doğrulama penceresi normal şekilde kapanmadı.' }
  }
  if ($launcher -and -not $launcher.HasExited) { $null = $launcher.WaitForExit(15000) }
  if ($null -eq $previousMode) { Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue } else { $env:NODE_ENV = $previousMode }
  if ($null -eq $previousData) { Remove-Item Env:IMAGESCANNER_DATA_DIR -ErrorAction SilentlyContinue } else { $env:IMAGESCANNER_DATA_DIR = $previousData }
}
