@echo off
REM ============================================================
REM  Clerune Tracker - one-click test launcher
REM  Double-click this file to run the app locally for testing.
REM ============================================================

REM Move into the folder this .bat lives in (the project root).
cd /d "%~dp0"

echo(
echo ============================================================
echo   Clerune Tracker - test launcher
echo ============================================================
echo(
echo   IMPORTANT: this app uses the LIVE database.
echo   Use a THROWAWAY passphrase (e.g. wallet-test-2026),
echo   NOT your real household one, so your real data is safe.
echo(
echo ============================================================
echo(

REM Make sure we're on the feature branch (ignore errors if git/branch missing).
git rev-parse --is-inside-work-tree >nul 2>&1 && git checkout feature/ai-finance-planner 2>nul

REM Install dependencies only if they're missing (first run / after a clean).
if not exist "node_modules" (
  echo Installing dependencies for the first time - this may take a minute...
  echo(
  call npm install
  if errorlevel 1 (
    echo(
    echo npm install failed. Is Node.js installed? Get it from https://nodejs.org
    echo(
    pause
    exit /b 1
  )
)

REM Open the browser a few seconds after the server starts booting.
start "" /min cmd /c "timeout /t 5 >nul & start "" http://localhost:5173"

echo Starting the dev server...
echo When you're done testing, click this window and press Ctrl+C to stop.
echo(

REM Run the dev server in the foreground (keeps this window alive).
call npm run dev

pause
