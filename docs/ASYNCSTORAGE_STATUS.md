# AsyncStorage Status - Current Situation

## ⚠️ Known Issue

**Error**: `[@RNC/AsyncStorage]: NativeModule: AsyncStorage is null`

**Status**: **UNRESOLVED** - Requires React Native Gradle Plugin setup

---

## Root Cause

React Native 0.76+ uses a new architecture for native modules that requires:
1. React Native Gradle Plugin for autolinking
2. TurboModule support
3. Proper build configuration

AsyncStorage v2.2.0 is a TurboModule and cannot be manually linked using the old Package-based approach.

---

## What We Tried

### ❌ Attempt 1: Autolinking with React Native Gradle Plugin
**Result**: Failed - caused dependency resolution issues with other native modules

### ❌ Attempt 2: Manual Linking
**Result**: Failed - AsyncStorage uses TurboModules, not the old Package system

### ❌ Attempt 3: Direct Project Include
**Result**: Failed - Gradle couldn't resolve React Native dependencies

---

## Current Workaround

**Your app uses SQLite as the primary storage**, which is working correctly. AsyncStorage is only used for:

1. **Migration** - One-time migration from AsyncStorage to SQLite (already completed for existing users)
2. **Billing/Activation** - Some billing state (can be refactored)
3. **UI State** - Template, recent messages (non-critical)

### Impact

- ✅ **Core SMS functionality works** - Queue, sending, receiving all use SQLite
- ✅ **Hermes engine working** - App runs with Hermes successfully
- ⚠️ **App crashes on launch** - Due to AsyncStorage initialization in BillingProvider

---

## Immediate Solution Required

### Option 1: Remove AsyncStorage Dependency (Recommended)

Replace AsyncStorage usage with SQLite or in-memory storage:

**Files to modify**:
1. `src/providers/BillingProvider.tsx` - Use SQLite for billing state
2. `src/hooks/useBulkPro.ts` - Use SQLite for templates/recents
3. `src/hooks/useLocalStorage.ts` - Create SQLite-based implementation
4. `src/hooks/useAppLock.ts` - Use SQLite for lock state
5. `src/db/database/core.ts` - Remove AsyncStorage migration (already done)

### Option 2: Downgrade AsyncStorage

Use an older version that supports manual linking:
```bash
npm install @react-native-async-storage/async-storage@1.17.11
```

Then manually link using the old Package approach.

### Option 3: Enable Full Autolinking (Complex)

Requires significant build configuration changes:
- Add React Native Gradle Plugin
- Configure all native modules for autolinking
- Fix dependency resolution for all modules
- May break existing patches

---

## Patches Created

The following patches were created during troubleshooting:

1. `@op-engineering+op-sqlite+15.1.6.patch` - Removed React plugin
2. `@react-native-picker+picker+2.11.4.patch` - Added buildConfig
3. `@shopify+flash-list+1.8.3.patch` - Added buildConfig
4. `react-native-document-picker+9.3.1.patch` - Added buildConfig
5. `react-native-fs+2.20.0.patch` - Added namespace
6. `@react-native-async-storage+async-storage+2.2.0.patch` - Fixed React Native dependency

**Note**: The AsyncStorage patch alone doesn't solve the issue - it needs proper autolinking.

---

## Recommended Action Plan

### Phase 1: Quick Fix (1-2 hours)
1. Create SQLite-based storage wrapper
2. Replace AsyncStorage calls in critical paths:
   - BillingProvider
   - useAppLock
3. Test app launch

### Phase 2: Complete Migration (3-4 hours)
1. Replace all AsyncStorage usage with SQLite
2. Remove `@react-native-async-storage/async-storage` dependency
3. Update all hooks and providers
4. Test thoroughly

### Phase 3: Cleanup
1. Remove AsyncStorage patches
2. Update documentation
3. Remove migration code (no longer needed)

---

## Files Using AsyncStorage

Critical (causes crash):
- `src/providers/BillingProvider.tsx` - **HIGH PRIORITY**
- `src/hooks/useAppLock.ts` - **HIGH PRIORITY**

Non-critical (can fail gracefully):
- `src/hooks/useBulkPro.ts` - Templates/recents
- `src/hooks/useLocalStorage.ts` - Generic storage hook
- `src/db/database/core.ts` - Migration (one-time, can be removed)

---

## Technical Details

### Why Manual Linking Fails

React Native 0.76+ TurboModules require:
```kotlin
// Old way (doesn't work)
packages.add(AsyncStoragePackage())

// New way (requires autolinking)
// Automatically registered via TurboModuleRegistry
```

### Why Autolinking Fails

Without React Native Gradle Plugin:
```gradle
// This fails to resolve
implementation 'com.facebook.react:react-native:+'

// Even with specific version
implementation 'com.facebook.react:react-android:0.76.9'
// Still needs proper Maven repository configuration
```

---

## Summary

**Hermes Issue**: ✅ **RESOLVED**  
**AsyncStorage Issue**: ⚠️ **REQUIRES CODE REFACTORING**

**Best Path Forward**: Replace AsyncStorage with SQLite-based storage to maintain consistency with your existing architecture and avoid complex build configuration issues.

---

## Next Steps

1. **Immediate**: Comment out AsyncStorage usage in BillingProvider to allow app to launch
2. **Short-term**: Implement SQLite-based storage wrapper
3. **Long-term**: Remove AsyncStorage dependency entirely

Would you like me to proceed with creating a SQLite-based storage wrapper to replace AsyncStorage?
