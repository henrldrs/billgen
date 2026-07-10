@echo off
rem Double-click me: starts the component-library preview and opens the browser.
rem First run installs dependencies (needs Node.js + npm on PATH).
setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found on PATH. Install Node.js first: https://nodejs.org
  pause
  exit /b 1
)

if not exist node_modules (
  echo First run - installing dependencies, this takes a minute...
  call npm install
  if errorlevel 1 (
    echo npm install failed - see output above.
    pause
    exit /b 1
  )
)

echo Starting preview at http://localhost:5174 - close this window to stop it.
call npm run preview:dev -- --open
pause
