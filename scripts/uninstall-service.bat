@echo off
REM displayerall Windows servisi kaldirma (Yonetici olarak calistir)

setlocal
set SERVICE_NAME=displayerall

where nssm >nul 2>nul
if errorlevel 1 (
  echo HATA: nssm.exe PATH'te bulunamadi.
  exit /b 1
)

echo Servis durduruluyor: %SERVICE_NAME%
nssm stop %SERVICE_NAME% >nul 2>nul

echo Servis kaldiriliyor: %SERVICE_NAME%
nssm remove %SERVICE_NAME% confirm

echo BITTI.
endlocal
