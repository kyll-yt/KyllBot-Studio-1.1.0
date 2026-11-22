@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js n'est pas installe.
  echo Installe Node.js 20 ou plus depuis https://nodejs.org/fr
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installation des dependances...
  call npm install
  if errorlevel 1 (
    echo L'installation a echoue.
    pause
    exit /b 1
  )
)

echo.
echo Demarrage de KyllBot Studio...
echo Ouvre http://localhost:12000 dans ton navigateur.
echo Pour arreter, ferme cette fenetre.
echo.
call npm start
pause
