@echo off
title Road Damage Detection - Testing Menu
color 0A
cd /d "%~dp0Model"

:start
echo.
echo  =============================================
echo    ROAD DAMAGE DETECTION - TESTING MENU
echo    Dinas Pekerjaan Umum Kabupaten Kubu Raya
echo  =============================================
echo.
echo  Pilih opsi testing:
echo.
echo   [1] Jalankan API Server         (port 5000)
echo   [2] Jalankan Testing UI         (port 5005)
echo   [3] Test gambar (drag & drop)
echo   [4] Test video (drag & drop)
echo   [5] Extract frames dari video
echo   [6] Cek info model
echo   [7] Test endpoint /health
echo   [8] Install dependencies
echo   [0] Keluar
echo.
echo  =============================================
set /p pilihan="Masukkan pilihan [0-8]: "

if "%pilihan%"=="1" goto api_server
if "%pilihan%"=="2" goto testing_ui
if "%pilihan%"=="3" goto test_gambar
if "%pilihan%"=="4" goto test_video
if "%pilihan%"=="5" goto extract_frames
if "%pilihan%"=="6" goto info_model
if "%pilihan%"=="7" goto test_health
if "%pilihan%"=="8" goto install_deps
if "%pilihan%"=="0" goto end
echo.
echo  Pilihan tidak valid!
pause
goto start

:api_server
echo.
echo  =============================================
echo    Memulai API Server di port 5000...
echo    Tekan Ctrl+C untuk berhenti
echo  =============================================
echo.
python api.py
pause
goto start

:testing_ui
echo.
echo  =============================================
echo    Memulai Testing UI di port 5005...
echo    Buka browser: http://localhost:5005
echo    Tekan Ctrl+C untuk berhenti
echo  =============================================
echo.
start http://localhost:5005
python testing_ui.py
pause
goto start

:test_gambar
echo.
echo  Drag & drop file gambar ke sini, lalu tekan Enter:
set /p file_gambar="> "
if "%file_gambar%"=="" (
    echo  Tidak ada file yang dipilih!
    pause
    goto start
)
set file_gambar=%file_gambar:"=%
echo.
echo  Testing gambar: %file_gambar%
echo  Tekan [Enter] untuk simpan hasil, atau Ctrl+C untuk tidak:
python test_model.py "%file_gambar%" --save
pause
goto start

:test_video
echo.
echo  Drag & drop file video ke sini, lalu tekan Enter:
set /p file_video="> "
if "%file_video%"=="" (
    echo  Tidak ada file yang dipilih!
    pause
    goto start
)
set file_video=%file_video:"=%
echo.
echo  Testing video: %file_video%
echo  (Bisa memakan waktu tergantung panjang video)
python test_model.py "%file_video%" --save
pause
goto start

:extract_frames
echo.
echo  Drag & drop file video untuk ekstrak frame, lalu tekan Enter:
set /p file_video="> "
if "%file_video%"=="" (
    echo  Tidak ada file yang dipilih!
    pause
    goto start
)
set file_video=%file_video:"=%
echo.
set /p prefix="Prefix nama file [kosongkan jika biasa]: "
if "%prefix%"=="" (
    python extract_frames.py "%file_video%" --interval 30 --threshold 0.90
) else (
    python extract_frames.py "%file_video%" --interval 30 --threshold 0.90 --prefix %prefix%
)
pause
goto start

:info_model
echo.
echo  =============================================
echo    Informasi Model
echo  =============================================
echo.
python test_model.py --info
pause
goto start

:test_health
echo.
echo  =============================================
echo    Test endpoint /health (port 5000)
echo  =============================================
echo.
echo  Pastikan API Server sedang berjalan!
echo.
curl http://localhost:5000/health
echo.
echo.
pause
goto start

:install_deps
echo.
echo  =============================================
echo    Install Dependencies
echo  =============================================
echo.
echo  Installing dari requirements.txt...
pip install -r requirements.txt
echo.
echo  Installing flask-cors...
pip install flask-cors
echo.
echo  =============================================
echo    Selesai!
echo  =============================================
pause
goto start

:end
echo.
echo  Sampai jumpa!
timeout /t 2 >nul
exit /b
