@echo off
title 3EJS Tech - Local Launcher
setlocal

REM ---------------------------------------------------------------
REM  3EJS Tech - One-click local launcher
REM  Starts the app on http://localhost:3001
REM ---------------------------------------------------------------

REM 1. Verify Node.js >= 18
where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js 18+ is required but was not found.
  echo Opening https://nodejs.org/en/download in your browser.
  start https://nodejs.org/en/download
  exit /b 1
)

for /f "tokens=1 delims=v." %%v in ('node -v') do set NODE_MAJOR=%%v
if %NODE_MAJOR% LSS 18 (
  echo [!] Node %NODE_MAJOR%.x detected. Need Node 18 LTS or newer.
  start https://nodejs.org/en/download
  exit /b 1
)

REM 2. Ensure .env.local exists - copy from .env.example if missing
if not exist ".env.local" (
  copy /Y ".env.example" ".env.local" >nul
)

REM 3. Ensure production dependencies are installed
if not exist "node_modules\next\package.json" (
  echo Installing production dependencies - first run only, this can take a few minutes...
  call npm install --omit=dev --no-audit --no-fund
  if errorlevel 1 goto :err
)

REM 4. Ensure the production build exists
if not exist ".next\BUILD_ID" (
  echo Building app - first run only, this can take a few minutes...
  call npx next build
  if errorlevel 1 goto :err
)

REM 5. Launch
start http://localhost:3001
call npx next start -p 3001
goto :eof

:err
echo.
echo [!] Something failed. Scroll up to see the error.
pause
