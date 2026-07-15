@echo off
echo ===================================================
echo   Expendx Automated Android APK Compiler
echo ===================================================
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

echo 5. Copying built APK to root folder...
copy "android\app\build\outputs\apk\debug\app-debug.apk" "expendx-debug.apk" /Y
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to copy APK to root folder!
    pause
    exit /b %errorlevel%
)
echo.

echo ===================================================
echo   SUCCESS! The updated APK is ready!
echo   Location: expendx-debug.apk (in the root folder)
echo ===================================================
echo.
pause
