@echo off
echo ==========================================
echo   ECHOES OF FALL — BCA Project 2026
echo ==========================================
cd /d "C:\Users\ACER\Desktop\Echoes of fall\EchoesOfFall"
start "" "http://localhost:8080"
python -m http.server 8080
pause
