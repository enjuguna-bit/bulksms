<#
.SYNOPSIS
    Automates the Android Release Build process locally.
    
.DESCRIPTION
    Runs all necessary steps to produce a signed release AAB/APK.
    Prerequisites: Java 17, Node.js, Android SDK configured in local.properties.
#>

Write-Host "🚀 Starting Local Release Build..." -ForegroundColor Cyan

# 1. Check Directories
if (-not (Test-Path "android")) {
    Write-Error "❌ 'android' directory not found. Are you in the project root?"
    exit 1
}

# 2. Install Dependencies
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to install dependencies"; exit 1 }

# 3. Clean Project
Write-Host "`n🧹 Cleaning previous builds..." -ForegroundColor Yellow
cd android
./gradlew clean
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to clean android project"; cd ..; exit 1 }

# 4. Build Release Bundle
Write-Host "`n🏗️  Building Release Bundle (.aab)..." -ForegroundColor Cyan
./gradlew bundleRelease
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed!"; cd ..; exit 1 }

# 5. Success
cd ..
$OutputPath = "android\app\build\outputs\bundle\release\app-release.aab"
if (Test-Path $OutputPath) {
    Write-Host "`n✅ Build Successful!" -ForegroundColor Green
    Write-Host "📂 Artifact located at: $OutputPath" -ForegroundColor Green
}

if (-not (Test-Path $OutputPath)) {
    Write-Error "❌ Build completed but artifact not found."
}

Write-Host "`n⚠️  Make sure you have configured your signing keys in 'android/gradle.properties' or have a keystore file ready to sign this build manually if you haven't set up auto-signing." -ForegroundColor Gray
