@echo off
title B2B Lead Generator - Antigravity
echo ==========================================================
echo       INICIANDO AI B2B LEAD GENERATOR & COPYWRITER
echo ==========================================================
echo.

echo [+] Instalando dependencias de Python...
python -m pip install -r requirements.txt

if %errorlevel% neq 0 (
    echo.
    echo [!] Error instalando dependencias. Asegurese de tener conexion a internet.
    pause
    exit /b %errorlevel%
)

echo.
echo [+] Dependencias listas.
echo [+] Iniciando servidor local en http://localhost:5000...
echo [+] Abriendo navegador...
start http://localhost:5000

echo.
echo ==========================================================
echo       SERVIDOR CORRIENDO. PRESIONE CTRL+C PARA SALIR
echo ==========================================================
echo.
python app.py
pause
