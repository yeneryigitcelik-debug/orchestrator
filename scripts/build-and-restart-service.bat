@echo off
REM Build yap ve servisi yeniden baslat (kod degistikten sonra)

setlocal
set SERVICE_NAME=displayerall

cd /d "%~dp0.."

echo [1/3] Build...
call pnpm build
if errorlevel 1 (
  echo Build basarisiz. Servis dokunulmadi.
  exit /b 1
)

where nssm >nul 2>nul
if errorlevel 1 (
  echo NSSM yok, servisi yeniden baslatamiyorum. Manuel: pnpm start
  exit /b 0
)

echo [2/3] Servis durduruluyor...
nssm stop %SERVICE_NAME%
timeout /t 2 /nobreak >nul

echo [3/3] Servis basliyor...
nssm start %SERVICE_NAME%

echo BITTI.
endlocal
