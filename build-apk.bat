@echo off
echo ===================================================
echo   Lucent Automated Android APK Compiler (Lean Build)
echo ===================================================
echo.

echo 0. Cleaning APK files from public and dist folders to prevent self-bundling bloat...
if exist "public\*.apk" del /F /Q "public\*.apk"
if exist "dist\*.apk" del /F /Q "dist\*.apk"
if exist "android\app\src\main\assets\public\*.apk" del /F /Q "android\app\src\main\assets\public\*.apk"
echo.

echo 1. Setting up Java Environment...
set JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.10.7-hotspot
echo    JAVA_HOME set to: %JAVA_HOME%
echo.

echo 2. Building Production Web Bundle (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Web build failed!
    pause
    exit /b %errorlevel%
)
echo.

echo 3. Synchronizing Web Assets to Capacitor (npx cap sync)...
call npx cap sync
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Capacitor sync failed!
    pause
    exit /b %errorlevel%
)
echo.

echo 4. Compiling Android Debug APK (gradlew clean assembleDebug)...
cd android
call gradlew.bat clean assembleDebug
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Gradle Android compilation failed!
    cd ..
    pause
    exit /b %errorlevel%
)
cd ..
echo.

echo 5. Copying built APK to root and dist folders...
copy "android\app\build\outputs\apk\debug\app-debug.apk" "lucent-latest.apk" /Y
copy "android\app\build\outputs\apk\debug\app-debug.apk" "expendx-latest.apk" /Y
copy "android\app\build\outputs\apk\debug\app-debug.apk" "expendx-debug.apk" /Y
if exist "dist" (
    copy "android\app\build\outputs\apk\debug\app-debug.apk" "dist\lucent-latest.apk" /Y
    copy "android\app\build\outputs\apk\debug\app-debug.apk" "dist\expendx-latest.apk" /Y
)

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to copy APK outputs!
    pause
    exit /b %errorlevel%
)
echo.

echo ===================================================
echo   SUCCESS! The lean Lucent APK is ready!
echo   Locations:
echo     - lucent-latest.apk (root)
echo     - expendx-latest.apk (root)
echo     - expendx-debug.apk (root)
echo ===================================================
echo.
