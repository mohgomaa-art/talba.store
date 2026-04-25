@echo off
echo ==========================================
echo    EKIEI - Triggering Taager Sync...
echo ==========================================
echo.
powershell -Command "Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/sync -ContentType 'application/json'"
echo.
echo Sync triggered! Check the server console for progress.
pause
