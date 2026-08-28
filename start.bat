@echo off
title HMS - Hostel Management System

echo Starting HMS Backend (port 5000)...
start "HMS Backend" cmd /k "node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run dev --prefix "d:\hostelwebappd\server""

echo Waiting for backend...
timeout /t 5 /nobreak > nul

echo Starting HMS Frontend (port 3000)...
start "HMS Frontend" cmd /k "node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run dev --prefix "d:\hostelwebappd\client""

echo.
echo ================================
echo  HMS is starting up!
echo.
echo  Student Portal:
echo  http://localhost:3000
echo.
echo  Warden Portal:
echo  http://localhost:3000/warden/login
echo  ID: WARDEN001 / Pass: Warden@2024
echo.
echo  Parent Portal:
echo  http://localhost:3000/parent/login
echo ================================
echo.
pause
