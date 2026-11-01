@echo off
setlocal
rem Chess GM launcher for Windows.
rem Opens a Chromium-based browser with the extension loaded from this folder,
rem using a separate browser profile so your normal windows are untouched.
rem Double-click this file, or in CMD: cd into this folder and type run.bat
rem Pass --no-pause to skip the final "press any key" (the installer does this).

set "EXT_DIR=%~dp0"
if "%EXT_DIR:~-1%"=="\" set "EXT_DIR=%EXT_DIR:~0,-1%"
set "PROFILE_DIR=%EXT_DIR%\.profile"
set "PF86=%ProgramFiles(x86)%"
set "BROWSER=%CHESS_GM_BROWSER%"
set "BRANDED_CHROME="

if defined BROWSER goto found

rem Google Chrome 137 and newer ignore --load-extension, so browsers that still
rem honor it are tried first. Set CHESS_GM_BROWSER to force a specific exe.
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
if defined BROWSER goto found

for %%P in (
  "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
  "%PF86%\Google\Chrome\Application\chrome.exe"
  "%LocalAppData%\Google\Chrome\Application\chrome.exe"
) do (
  if not defined BROWSER if exist "%%~P" set "BROWSER=%%~P"
)
if defined BROWSER set "BRANDED_CHROME=1"
if defined BROWSER goto found

echo Could not find Chromium, Brave, Edge, or Chrome on this PC.
echo.
echo Either set CHESS_GM_BROWSER to your browser's exe path and run this again,
echo or load the extension by hand:
echo   1. Open your browser and go to  chrome://extensions
echo   2. Turn on "Developer mode" (top right)
echo   3. Click "Load unpacked" and pick this folder:
echo      %EXT_DIR%
goto end

:found
echo Browser:   %BROWSER%
echo Extension: %EXT_DIR%
echo Profile:   %PROFILE_DIR%
echo.
if defined BRANDED_CHROME goto branded

start "" "%BROWSER%" --user-data-dir="%PROFILE_DIR%" --load-extension="%EXT_DIR%" --no-first-run --no-default-browser-check "https://www.chess.com/"
echo A browser window is opening with Chess GM loaded. Sign in to chess.com or
echo lichess in that window (it has its own profile), start a game, and
echo right-click-drag a piece to try it.
echo.
echo If Chess GM is missing from that window, load it by hand:
echo   1. In that window go to  chrome://extensions
echo   2. Turn on "Developer mode" (top right)
echo   3. Click "Load unpacked" and pick this folder:
echo      %EXT_DIR%
goto end

:branded
<nul set /p "=%EXT_DIR%" | clip
start "" "%BROWSER%" --user-data-dir="%PROFILE_DIR%" --no-first-run --no-default-browser-check "chrome://extensions" "https://www.chess.com/"
echo Google Chrome (version 137 and newer) no longer loads extensions from the
echo command line, so Chrome is opening on its extensions page instead.
echo In that window:
echo   1. Turn on "Developer mode" (top right)
echo   2. Click "Load unpacked"
echo   3. Paste this folder path (it is already on your clipboard) and click Select Folder:
echo      %EXT_DIR%
echo Then switch to the chess.com tab, sign in, and play.
goto end

:end
echo.
if /i "%~1"=="--no-pause" goto done
rem Keep the window open when started by double-click so the text above can be read.
echo %cmdcmdline% | find /i "/c" >nul && pause
:done
endlocal
