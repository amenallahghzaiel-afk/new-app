@echo off
title Inventory Monitor - Windows Local Setup Setup Assistant
color 0B
cls
echo =======================================================================
echo          RESTAURANT INVENTORY MONITOR - WINDOWS LOCAL SETUP
echo =======================================================================
echo.
echo This assistant will help you install dependencies and configure the app.
echo.

:: Check Node.js installation
echo [1/3] Verifying Node.js environment...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERR] Node.js is NOT installed on this machine!
    echo Node.js is required to run this modern inventory applet locally.
    echo.
    echo Press any key to open the official Node.js installer download page...
    pause >nul
    start https://nodejs.org/en/download/prebuilt-installer
    echo.
    echo Once you have downloaded and installed Node.js (Recommended: LTS version),
    echo please restart this installer script.
    echo.
    pause
    exit /b
)

echo [OK] Node.js is installed at version:
node -v
echo.

:: Run NPM Install
echo [2/3] Installing application dependencies...
echo This might take a minute depending on your internet connection.
echo Please wait...
echo.
call npm install
if %errorlevel% neq 0 (
    color 0E
    echo.
    echo [WARNING] Dependency installation finished with errors or warnings.
    echo If some packages failed to install, please make sure you are online and retry.
    echo.
) else (
    echo [OK] All packages and developer tools installed successfully!
)

echo.
:: Create local database or environment template if it does not exist
echo [3/3] Setting up local environment preferences...
if not exist .env (
    copy .env.example .env >nul 2>&1
    echo [OK] Created local .env configuration from example template.
) else (
    echo [OK] .env configuration already exists.
)

echo.
echo =======================================================================
echo                     SETUP COMPLETE AND SUCCESSFUL!
echo =======================================================================
echo.
echo You are now ready to run the application offline on your local computer.
echo.
echo To start the app, double-click the:  run-app.bat  script file.
echo.
echo Press any key to exit this installation setup...
pause >nul
