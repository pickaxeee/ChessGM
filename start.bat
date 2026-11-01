@echo off
setlocal
rem Chess GM launcher for Windows. Opens a Chromium-based browser with the
rem extension loaded from this folder, using a separate profile so it does
rem not interfere with your normal browser windows.

set "EXT_DIR=%~dp0"
if "%EXT_DIR:~-1%"=="\" set "EXT_DIR=%EXT_DIR:~0,-1%"
set "PROFILE_DIR=%EXT_DIR%\.profile"
set "PF86=%ProgramFiles(x86)%"
set "BROWSER=%CHESS_GM_BROWSER%"
set "BRANDED_CHROME="

rem Google Chrome 137 and newer ignore --load-extension, so browsers that still
rem honor it are tried first. Set CHESS_GM_BROWSER to force a specific exe.
if not defined BROWSER (
  for %%P in (
    "%LocalAppData%\Chromium\Application\chrome.exe"
    "%ProgramFiles%\Chromium\Application\chrome.exe"
    "%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe"
    "%PF86%\BraveSoftware\Brave-Browser\Application\brave.exe"
    "%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe"
    "%PF86%\Microsoft\Edge\Application\msedge.exe"
    "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
  ) do (
    if not defined BROWSER if exist "%%~P" set "BROWSER=%%~P"
  )
)
if not defined BROWSER (
  for %%P in (
    "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
    "%PF86%\Google\Chrome\Application\chrome.exe"
    "%LocalAppData%\Google\Chrome\Application\chrome.exe"
  ) do (
    if not defined BROWSER if exist "%%~P" set "BROWSER=%%~P" & set "BRANDED_CHROME=1"
  )
)

if not defined BROWSER (
  echo Could not find Chromium, Brave, Edge, or Chrome.
  echo Set CHESS_GM_BROWSER to your browser exe, or load the extension by hand:
  echo   open chrome://extensions, turn on Developer mode, click Load unpacked,
  echo   and pick this folder: %EXT_DIR%
  exit /b 1
)

echo Browser:   %BROWSER%
echo Extension: %EXT_DIR%
echo Profile:   %PROFILE_DIR%
echo.

if defined BRANDED_CHROME (
  echo Google Chrome ignores --load-extension since version 137, so the
  echo extensions page is opening instead. Turn on Developer mode, click
  echo Load unpacked, and paste this path ^(it is already on your clipboard^):
  echo   %EXT_DIR%
  echo %EXT_DIR%| clip
  start "" "%BROWSER%" --user-data-dir="%PROFILE_DIR%" --no-first-run --no-default-browser-check "chrome://extensions" "https://www.chess.com/"
) else (
  start "" "%BROWSER%" --user-data-dir="%PROFILE_DIR%" --load-extension="%EXT_DIR%" --no-first-run --no-default-browser-check "https://www.chess.com/"
  echo If Chess GM is missing from the window that opened, load it by hand:
  echo   chrome://extensions, Developer mode, Load unpacked, pick %EXT_DIR%
)
endlocal
