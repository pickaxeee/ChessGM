@echo off
setlocal
rem Chess GM one-time setup for Windows.
rem Opens your browser's extensions page and File Explorer side by side so you
rem can add this folder with "Load unpacked". After that the extension stays
rem installed in your browser; you never need to run this again.
rem Double-click this file, or in CMD: cd into this folder and type setup.bat

set "EXT_DIR=%~dp0"
if "%EXT_DIR:~-1%"=="\" set "EXT_DIR=%EXT_DIR:~0,-1%"
set "PF86=%ProgramFiles(x86)%"
set "BROWSER=%CHESS_GM_BROWSER%"
if defined BROWSER goto found

for %%P in (
  "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
  "%PF86%\Google\Chrome\Application\chrome.exe"
  "%LocalAppData%\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe"
  "%PF86%\BraveSoftware\Brave-Browser\Application\brave.exe"
  "%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe"
  "%PF86%\Microsoft\Edge\Application\msedge.exe"
  "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
  "%LocalAppData%\Chromium\Application\chrome.exe"
  "%ProgramFiles%\Chromium\Application\chrome.exe"
) do (
  if not defined BROWSER if exist "%%~P" set "BROWSER=%%~P"
)
if defined BROWSER goto found

echo Could not find Chrome, Brave, Edge, or Chromium on this PC.
echo Chess GM needs one of them (Firefox and Safari are not supported).
echo.
echo If you do have one, open it, go to  chrome://extensions , turn on
echo "Developer mode" (top right), click "Load unpacked", and pick this folder:
echo   %EXT_DIR%
goto end

:found
rem Put the folder path on the clipboard so it can be pasted into the Load unpacked dialog.
<nul set /p "=%EXT_DIR%" | clip
start "" "%BROWSER%" "chrome://extensions"
start "" explorer /select,"%EXT_DIR%"

echo Chess GM folder:  %EXT_DIR%
echo.
echo Two windows just opened: your browser's extensions page and a File
echo Explorer window with the Chess GM folder selected. In the browser:
echo.
echo   1. Turn on "Developer mode" (switch in the top right)
echo   2. Click "Load unpacked"
echo   3. Paste the folder path (Ctrl+V, it is on your clipboard) and click Select Folder
echo      ...or just drag the Chess GM folder from Explorer onto the extensions page
echo.
echo That is it. Open chess.com or lichess and right-click-drag a piece.
echo The extension stays installed as long as this folder exists, so leave it where it is.

:end
echo.
if /i "%~1"=="--no-pause" goto done
rem Keep the window open when started by double-click so the text above can be read.
echo %cmdcmdline% | find /i "/c" >nul && pause
:done
endlocal
