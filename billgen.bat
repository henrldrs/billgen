@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title BillGen - local launcher

REM Rust lives here and is NOT on the default PATH (needed for the desktop app).
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
REM Give the dev API a >=32 byte JWT secret so it doesn't warn.
if "%JWT_SECRET%"=="" set "JWT_SECRET=local-dev-secret-change-me-0123456789abcd"
REM SQLite dev DB lives in var\ ; make sure the folder exists.
if not exist "var" md "var"

:menu
cls
echo ============================================================
echo    BillGen - local test launcher
echo ------------------------------------------------------------
echo    Web app  = FastAPI (port 8000) + SaaS UI (port 5173)
echo    Desktop  = native window, self-contained (own SQLite)
echo ============================================================
echo.
echo    [1]  Web app      (starts API + UI, opens the browser)
echo    [2]  Desktop app  (native window; first run compiles)
echo    [3]  Run all tests
echo    [4]  First-time setup (npm install + DB migrate)
echo    [5]  Quit
echo.
set /p "choice=Choose 1-5: "

if "%choice%"=="1" goto web
if "%choice%"=="2" goto desktop
if "%choice%"=="3" goto tests
if "%choice%"=="4" goto setup
if "%choice%"=="5" goto end
goto menu

:web
echo.
echo Starting the API and the web UI in two new windows...
start "BillGen API" cmd /k "cd /d "%~dp0" && set "DESKTOP_MODE=true" && python -m alembic upgrade head && python -m uvicorn api.main:app --port 8000"
timeout /t 4 >nul
start "BillGen Web" cmd /k "cd /d "%~dp0" && npm run dev --workspace @billgen/saas"
timeout /t 6 >nul
start "" http://localhost:5173
echo.
echo Opened: API window + Web window + browser at http://localhost:5173
echo Sign up with any email/password (min 8 chars). Close both windows to stop.
echo.
pause
goto menu

:desktop
echo.
echo Launching the desktop app. The FIRST run compiles Rust (a few minutes);
echo later runs are fast. A native BillGen window will open.
start "BillGen Desktop" cmd /k "cd /d "%~dp0frontend-electron" && set "PATH=%USERPROFILE%\.cargo\bin;%PATH%" && set "BILLGEN_ROOT=%~dp0" && npx tauri dev"
echo.
echo A separate window is compiling/launching the desktop app.
pause
goto menu

:tests
echo.
echo === Python tests (core + api + db + desktop) ===
python -m pytest tests -q
echo.
echo === Frontend tests (@billgen/ui) ===
call npm run test --workspace @billgen/ui
echo.
pause
goto menu

:setup
echo.
echo === Installing JavaScript dependencies (npm workspaces) ===
call npm install
echo.
echo === Applying database migrations ===
python -m alembic upgrade head
echo.
echo Setup complete.
pause
goto menu

:end
endlocal
