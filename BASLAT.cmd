@echo off
setlocal
cd /d "%~dp0"
if exist "%~dp0dist\ImageScanner-1.0.0-portable.exe" (
  start "" "%~dp0dist\ImageScanner-1.0.0-portable.exe"
  exit /b
)
if exist "%~dp0dist\win-unpacked\ImageScanner.exe" (
  start "" "%~dp0dist\win-unpacked\ImageScanner.exe"
  exit /b
)
if exist "%~dp0node_modules\electron\cli.js" (
  call npm start
  exit /b
)
echo Once npm ci komutu ile gelistirme bagimliliklarini yukleyin.
pause
