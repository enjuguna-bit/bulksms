@echo off
cd android
call gradlew clean
cd ..
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
