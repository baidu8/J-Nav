@echo off
echo [1/3] Adding changes...
git add .

set /p msg="Enter commit message (default: Update UI): "
if "%msg%"=="" set msg=Update UI

echo [2/3] Committing...
git commit -m "%msg%"

echo [3/3] Pushing to remote...
git push origin main

echo Done! Press any key to exit.
pause