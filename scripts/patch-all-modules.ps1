# Patch all native modules for React Native 0.76+ / AGP 8+ compatibility

Write-Host "🔧 Patching native modules for React Native 0.76+ compatibility..." -ForegroundColor Cyan

$modules = @(
    "@shopify/flash-list",
    "@react-native-async-storage/async-storage",
    "react-native-contacts",
    "react-native-device-info",
    "react-native-gesture-handler",
    "react-native-reanimated",
    "react-native-safe-area-context",
    "react-native-screens"
)

foreach ($module in $modules) {
    $buildGradle = "node_modules\$module\android\build.gradle"
    
    if (!(Test-Path $buildGradle)) {
        Write-Host "⏭️  Skipping $module (not found)" -ForegroundColor Yellow
        continue
    }
    
    $content = Get-Content $buildGradle -Raw
    
    # Check if buildFeatures already exists
    if ($content -match "buildFeatures\s*\{") {
        Write-Host "✅ $module already has buildFeatures" -ForegroundColor Green
        continue
    }
    
    # Add buildFeatures after defaultConfig
    $newContent = $content -replace "(\s+defaultConfig\s*\{[^\}]+\})", "`$1`n`n    buildFeatures {`n        buildConfig true`n    }"
    
    if ($newContent -ne $content) {
        Set-Content $buildGradle -Value $newContent -NoNewline
        Write-Host "✅ Patched $module" -ForegroundColor Green
        
        # Create patch
        try {
            npx patch-package $module 2>$null
            Write-Host "   📦 Created patch for $module" -ForegroundColor Gray
        } catch {
            Write-Host "   ⚠️  Could not create patch" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n✨ All modules patched!" -ForegroundColor Green
