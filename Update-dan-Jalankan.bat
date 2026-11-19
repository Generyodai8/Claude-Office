@echo off
chcp 65001 >nul
title Agent Office - Update dan Jalankan
cd /d "%~dp0"
echo.
echo === Agent Office: ambil update terbaru dari GitHub ===
echo (office.config.json, office.roster.json, dan telegram.json Anda TIDAK ditimpa)
echo.
set "TMPD=%TEMP%\agent-office-update"
if exist "%TMPD%" rmdir /s /q "%TMPD%"
mkdir "%TMPD%"
powershell -NoProfile -Command "try { [Net.ServicePointManager]::SecurityProtocol='Tls12'; Invoke-WebRequest -UseBasicParsing 'https://github.com/Generyodai8/Claude-Office/archive/refs/heads/main.zip' -OutFile '%TMPD%\main.zip'; Expand-Archive -Force '%TMPD%\main.zip' '%TMPD%\x'; exit 0 } catch { Write-Host $_.Exception.Message; exit 1 }"
if errorlevel 1 (
  echo.
  echo Gagal mengunduh update. Cek koneksi internet, lalu coba lagi.
  echo Aplikasi tetap dijalankan dengan versi yang ada sekarang.
  goto run
)
robocopy "%TMPD%\x\Claude-Office-main" "%~dp0." /E /XF office.config.json office.roster.json telegram.json /XD node_modules .git >nul
if errorlevel 8 (
  echo Gagal menyalin file update.
  goto run
)
echo Update selesai.
call npm install --no-audit --no-fund
:run
rmdir /s /q "%TMPD%" 2>nul
echo.
echo === Menjalankan Agent Office di http://localhost:3333/ ===
start "" "http://localhost:3333/"
call npm run dev:all
pause
