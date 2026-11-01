# Chess GM installer for Windows.
#
# Paste this into CMD or PowerShell:
#   powershell -c "irm https://raw.githubusercontent.com/pickaxeee/ChessGM/main/install.ps1 | iex"
#
# It downloads the latest code into %LocalAppData%\ChessGM, adds a "Chess GM"
# entry to the Start menu, and launches run.bat. Run the same command again
# any time to update; your browser sign-in (the .profile folder) is kept.

$ErrorActionPreference = 'Stop'

$repo = 'pickaxeee/ChessGM'
$branch = 'main'
$dest = Join-Path $env:LOCALAPPDATA 'ChessGM'
$zipUrl = "https://github.com/$repo/archive/refs/heads/$branch.zip"

# Older Windows PowerShell builds do not enable TLS 1.2 by default, and GitHub requires it.
try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
} catch {}

$tmp = Join-Path ([IO.Path]::GetTempPath()) ('chessgm-' + [IO.Path]::GetRandomFileName())
New-Item -ItemType Directory -Path $tmp | Out-Null
$zip = Join-Path $tmp 'chessgm.zip'

Write-Host "Downloading Chess GM from $zipUrl ..."
Invoke-WebRequest -Uri $zipUrl -OutFile $zip -UseBasicParsing
Expand-Archive -Path $zip -DestinationPath $tmp -Force
$src = Get-ChildItem -Path $tmp -Directory | Where-Object { $_.Name -like 'ChessGM-*' } | Select-Object -First 1
if (-not $src) { throw 'The downloaded archive did not contain a ChessGM folder.' }

# Replace the code but keep .profile, which holds the browser sign-in.
New-Item -ItemType Directory -Path $dest -Force | Out-Null
Get-ChildItem -Path $dest -Force | Where-Object { $_.Name -ne '.profile' } | Remove-Item -Recurse -Force
Get-ChildItem -Path $src.FullName -Force | Move-Item -Destination $dest -Force
Remove-Item -Path $tmp -Recurse -Force

# Start menu entry, so next time it can be launched without a terminal.
try {
  $programs = [Environment]::GetFolderPath('Programs')
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut((Join-Path $programs 'Chess GM.lnk'))
  $shortcut.TargetPath = Join-Path $dest 'run.bat'
  $shortcut.WorkingDirectory = $dest
  $shortcut.IconLocation = (Join-Path $dest 'icons\icon.ico') + ',0'
  $shortcut.Description = 'Chess GM: scratch moves on chess.com and lichess'
  $shortcut.Save()
  Write-Host 'Added "Chess GM" to the Start menu.'
} catch {
  Write-Host "Skipped the Start menu shortcut: $($_.Exception.Message)"
}

Write-Host ''
Write-Host "Installed to $dest"
Write-Host 'Next time: search the Start menu for "Chess GM", or run:'
Write-Host "  $dest\run.bat"
Write-Host 'Re-run the install command any time to update.'
Write-Host ''

& $env:ComSpec /c (Join-Path $dest 'run.bat') --no-pause
