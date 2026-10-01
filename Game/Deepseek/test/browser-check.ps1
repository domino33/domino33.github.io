# ============================================================================
#  test/browser-check.ps1 — автопроверка страницы тренажёра в headless Chrome.
#  Собирает browser-check.html (index.html + инъекция test/inject.html, которая
#  прогоняет часть сценария через window.TREN), запускает Chrome и печатает
#  результат: число ошибок JS, счётчики вызовов рендера, состояние сцены.
#
#  Запуск:  powershell -ExecutionPolicy Bypass -File test/browser-check.ps1
# ============================================================================
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$chromeCandidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
)
$chrome = $chromeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) { Write-Error 'Chrome/Edge не найден'; exit 2 }

# 1. Собираем страницу проверки
$html = Get-Content (Join-Path $root 'index.html') -Raw -Encoding UTF8
$inject = Get-Content (Join-Path $root 'test\inject.html') -Raw -Encoding UTF8
$checkPage = Join-Path $root 'browser-check.html'
[IO.File]::WriteAllText($checkPage, $html.Replace('</body>', $inject + '</body>'), [Text.Encoding]::UTF8)

# 2. Копируем в ASCII-путь (Chrome надёжнее работает с латиницей)
$dst = Join-Path $env:TEMP 'tren-check'
if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
New-Item -ItemType Directory $dst | Out-Null
foreach ($item in @('index.html', 'styles.css', 'src', 'vendor')) { Copy-Item (Join-Path $root $item) $dst -Recurse }
Copy-Item $checkPage $dst
Copy-Item (Join-Path $root 'src') $dst -Recurse -Force
$url = 'file:///' + ($dst -replace '\\', '/') + '/browser-check.html'

# 3. Запускаем headless-браузер
$out = Join-Path $env:TEMP 'tren-dump.html'
$err = Join-Path $env:TEMP 'tren-dump.err'
$p = Start-Process -FilePath $chrome -ArgumentList '--headless=new', '--disable-gpu', '--no-sandbox',
  '--virtual-time-budget=9000', '--dump-dom', $url -RedirectStandardOutput $out -RedirectStandardError $err -NoNewWindow -Wait -PassThru

$txt = Get-Content $out -Raw
$result = ''
if ($txt -match 'id="test-result">([^<]*)<') { $result = $matches[1] }
if (-not $result) { Write-Error "Нет результата проверки (exit=$($p.ExitCode)). См. $err"; exit 1 }
Write-Output $result
try {
  $json = $result | ConvertFrom-Json
  if ($json.ok -and $json.errors.Count -eq 0) { Write-Output 'BROWSER-CHECK: OK'; exit 0 }
  Write-Output 'BROWSER-CHECK: FAIL'; exit 1
} catch { Write-Output 'BROWSER-CHECK: FAIL (не удалось разобрать результат)'; exit 1 }
