@echo off
title Restaurant Inventory Monitor - Local Web Server Active
color 0A
cls
echo =======================================================================
echo             STARTING RESTAURANT INVENTORY MONITOR LOCAL
echo =======================================================================
echo.
echo Launching your fully-functional local inventory manager...
echo.

:: Auto-opening default web browser pointing to port 3000
echo Creating background request to open the browser...
start http://localhost:3000

echo Starting development web server on port 3000...
echo Keep this window open while using the application!
echo To turn off the server, close this window or press Ctrl+C inside it.
echo.
echo =======================================================================
echo.
call npm run dev
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo.
    echo [ERR] App failed to run on port 3000.
    echo Please make sure no other program is using port 3000, 
    echo or make sure you have run the 'setup-windows.bat' first!
    echo.
    pause
)
