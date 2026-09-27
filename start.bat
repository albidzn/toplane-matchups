@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies, this only happens once...
  call npm install
)
if not exist dist (
  echo Building app...
  call npm run build
)
start "" http://localhost:4747
call npm start
