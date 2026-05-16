@echo off
REM ============================================================
REM orchestrator — Windows servisi kurulumu (NSSM gerektirir)
REM Onceden: 1) NSSM kurulu olmali (https://nssm.cc/download)
REM           nssm.exe PATH'te olmali
REM         2) pnpm install ve pnpm build calistirilmis olmali
REM
REM Kullanim: cmd'yi Yonetici olarak ac, sonra:
REM           cd C:\Users\PC\orchestrator
REM           scripts\install-service.bat
REM ============================================================

setlocal

set SERVICE_NAME=orchestrator
set APP_ROOT=%~dp0..
pushd "%APP_ROOT%"
set APP_ROOT=%CD%
popd

where nssm >nul 2>nul
if errorlevel 1 (
  echo HATA: nssm.exe PATH'te bulunamadi. https://nssm.cc/download adresinden indirip kur.
  exit /b 1
)

if not exist "%APP_ROOT%\.next" (
  echo HATA: .next yok. Once: pnpm install && pnpm build
  exit /b 1
)

REM Node.exe konumu (genelde sabit, gerekirse degistir)
set NODE_EXE=C:\Program Files\nodejs\node.exe
if not exist "%NODE_EXE%" (
  echo HATA: Node bulunamadi: "%NODE_EXE%". Path'i bu dosyada duzelt.
  exit /b 1
)

echo Servis kuruluyor: %SERVICE_NAME%
nssm install %SERVICE_NAME% "%NODE_EXE%" "%APP_ROOT%\scripts\start.mjs"
nssm set %SERVICE_NAME% AppDirectory "%APP_ROOT%"
nssm set %SERVICE_NAME% DisplayName "orchestrator - Claude Orchestrator"
nssm set %SERVICE_NAME% Description "Lokal paralel Claude Code worker orkestratoru"
nssm set %SERVICE_NAME% Start SERVICE_AUTO_START
nssm set %SERVICE_NAME% AppStdout "%APP_ROOT%\logs\service.out.log"
nssm set %SERVICE_NAME% AppStderr "%APP_ROOT%\logs\service.err.log"
nssm set %SERVICE_NAME% AppRotateFiles 1
nssm set %SERVICE_NAME% AppRotateBytes 10485760
nssm set %SERVICE_NAME% AppEnvironmentExtra NODE_ENV=production PORT=3000

echo Servis kayit edildi. Baslatiliyor...
nssm start %SERVICE_NAME%

echo.
echo BITTI. Panel: http://localhost:3000
echo Durdur:     nssm stop %SERVICE_NAME%
echo Baslat:     nssm start %SERVICE_NAME%
echo Yeniden:    nssm restart %SERVICE_NAME%
echo Kaldir:     scripts\uninstall-service.bat

endlocal
