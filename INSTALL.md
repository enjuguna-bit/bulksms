# BulkSMS APK Installation

## APK Location
```
c:\bulksms\android\app\build\outputs\apk\release\app-release.apk
```

## Installation Methods

### Method 1: ADB (Fastest)
```powershell
# 1. Enable USB Debugging on your Android device
# Settings > About Phone > Tap Build Number 7 times
# Settings > Developer Options > Enable USB Debugging

# 2. Connect device via USB
adb devices

# 3. Install APK
adb install "c:\bulksms\android\app\build\outputs\apk\release\app-release.apk"
```

### Method 2: File Transfer
1. Copy `app-release.apk` to your device via USB
2. On device: Settings > Security > Allow Unknown Sources
3. Tap the APK file to install

### Method 3: Cloud Transfer
1. Upload `app-release.apk` to Google Drive/Dropbox
2. Open the link on your device
3. Download and install

## App Information
- **Package Name**: com.bulksms.smsmanager
- **Version**: 1.1.1 (Version Code: 2)
- **Size**: ~15-20 MB
- **Permissions**: SMS, Contacts, Storage, Location

## Troubleshooting
- **"Install blocked"**: Enable "Unknown Sources" in device settings
- **"App not installed"**: Clear cache of existing app first
- **"Parse error"**: APK may be corrupted, rebuild if needed

## After Installation
1. Grant SMS permissions when prompted
2. Grant Contacts permissions for recipient selection
3. Grant Storage permissions for file exports
4. Grant Location permissions for region-specific features

The app includes the database timeout fixes and should start properly on your device.
