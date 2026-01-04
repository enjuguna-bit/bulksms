<#
.SYNOPSIS
    Automates the Android Release Build process locally.
    
.DESCRIPTION
    Runs all necessary steps to produce a signed release APK and install it.
    Prerequisites: Java 17, Node.js, Android SDK configured in local.properties.
#>

Write-Host "Starting Local Release Build..." -ForegroundColor Cyan

# 1. Check Directories
if (-not (Test-Path "android")) {
    Write-Error "'android' directory not found. Are you in the project root?"
    exit 1
}

# 2. Install Dependencies
Write-Host "`nInstalling dependencies..." -ForegroundColor Yellow
npm install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to install dependencies"; exit 1 }

# 3. Clean Project
Write-Host "`nCleaning previous builds..." -ForegroundColor Yellow
cd android
./gradlew clean
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to clean android project"; cd ..; exit 1 }
cd ..

# 3.1 Rebuild JS Bundle
Write-Host "`nRebuilding React Native Bundle..." -ForegroundColor Cyan
if (Test-Path "android/app/src/main/assets/index.android.bundle") {
    Remove-Item "android/app/src/main/assets/index.android.bundle" -Force
}
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to bundle RN"; exit 1 }

cd android

# 4. Build Release Bundle
Write-Host "`nBuilding Release APK..." -ForegroundColor Cyan
./gradlew assembleRelease
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed!"; cd ..; exit 1 }

# 5. Success
cd ..
$OutputPath = "android\app\build\outputs\apk\release\app-release.apk"
if (Test-Path $OutputPath) {
    Write-Host "`nBuild Successful!" -ForegroundColor Green
    Write-Host "Artifact located at: $OutputPath" -ForegroundColor Green

    # 6. Install to Device
    Write-Host "`nInstalling to device..." -ForegroundColor Yellow
    adb install -r $OutputPath
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Installation Successful!" -ForegroundColor Green
    } else {
        Write-Error "Installation failed. Check if device is connected."
    }
} else {
    Write-Error "Build completed but artifact not found."
}
