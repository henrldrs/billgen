@echo off
REM Run the BillGen professional audit and open the report.
REM Double-click this, or run it from a terminal.
cd /d "%~dp0"
python -m billgen_audit run --open %*
if errorlevel 1 (
  echo.
  echo A high-confidence CRITICAL finding is present. See the report above.
)
pause
