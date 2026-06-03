# React Native 0.74 → 0.85 Migration Plan
## NeuraLife Mobile App Upgrade Strategy

> **STATUS:** Preparation phase - execute after Teacher Mobile App Foundation complete  
> **TARGET DATE:** After current milestone, before production release  
> **ESTIMATED EFFORT:** 1-2 weeks (including testing)

---

## 🎯 Performance Gains Expected

- **43% faster cold starts** (critical for teacher app usage)
- **39% faster rendering** (better for attendance marking with 30+ students)
- **26% lower memory usage** (helps with WatermelonDB + offline data)
- **Better animation performance** (your Reanimated 3 animations)
- **Improved Metro startup** (faster dev experience)

---

## 📋 Pre-Upgrade Compatibility Audit

### ✅ COMPATIBLE (verified working)
```json
"@react-navigation/*": "6.x" - New Architecture ready
"@tanstack/react-query": "5.x" - Compatible  
"react-native-reanimated": "3.10.1" - New Architecture optimized
"react-native-gesture-handler": "2.16.2" - Compatible
"react-native-safe-area-context": "4.10.1" - Compatible
"zustand": "4.5.2" - Pure JS, no issues
```

### ⚠️ NEEDS VERIFICATION
```json
"@nozbe/watermelondb": "0.27.1" - CHECK: New Architecture compatibility
"@react-native-firebase/*": "20.0.0" - CHECK: RN 0.85 support  
"react-native-ble-plx": "3.2.0" - CRITICAL: BLE for SmartPad sync
"react-native-biometrics": "3.0.1" - CHECK: TurboModules support
"@notifee/react-native": "9.1.8" - CHECK: New Architecture
"react-native-keychain": "8.2.0" - CHECK: Fabric compatibility
```

### 🔧 REQUIRES UPDATE
```json
"react": "18.2.0" → "19.x" (bundled with RN 0.85)
"@react-native/metro-config": "0.74.0" → "0.85.x"
"@react-native/babel-preset": "0.74.0" → "0.85.x"
"@react-native/eslint-config": "0.74.0" → "0.85.x"
"@react-native/typescript-config": "0.74.0" → "0.85.x"
```

---

## 🛠️ Step-by-Step Upgrade Process

### Phase 1: Environment Preparation (1 day)

1. **Update Node.js**
   ```bash
   # Ensure Node.js 20.19.4+
   node --version  # Must be >= 20.19.4
   ```

2. **Create upgrade branch**
   ```bash
   git checkout -b upgrade/react-native-085
   git push -u origin upgrade/react-native-085
   ```

3. **Backup critical files**
   ```bash
   cp -r android/ android_backup/
   cp -r ios/ ios_backup/
   cp package.json package.json.backup
   cp metro.config.js metro.config.js.backup
   ```

### Phase 2: React Native Core Upgrade (2-3 days)

1. **Use React Native Upgrade Helper**
   ```bash
   # Visit: https://react-native-community.github.io/upgrade-helper/
   # From: 0.74.0 → To: 0.85.3
   # Follow file-by-file diff
   ```

2. **Update package.json**
   ```json
   {
     "react-native": "0.85.3",
     "react": "19.x.x",
     "@react-native/metro-config": "0.85.x",
     "@react-native/babel-preset": "0.85.x"
   }
   ```

3. **Install new Jest preset**
   ```bash
   pnpm add -D @react-native/jest-preset
   # Update jest.config.js: preset: '@react-native/jest-preset'
   ```

4. **Update native files**
   - `android/build.gradle` - AGP version
   - `android/gradle.properties` - Hermes enabled
   - `MainApplication.java` - New Architecture flags
   - `ios/Podfile` - RCT-Folly version

### Phase 3: Fix Breaking Changes (1 day)

1. **StyleSheet fix**
   ```typescript
   // OLD (will break):
   StyleSheet.absoluteFillObject
   
   // NEW:
   StyleSheet.absoluteFill
   ```

2. **Update Jest config**
   ```javascript
   // jest.config.js
   module.exports = {
     preset: '@react-native/jest-preset', // NEW
     // Remove: preset: 'react-native'
   };
   ```

### Phase 4: Dependency Updates & Testing (3-4 days)

1. **Update compatible dependencies**
   ```bash
   pnpm update @react-navigation/native
   pnpm update @react-navigation/bottom-tabs
   pnpm update react-native-reanimated
   ```

2. **Test critical native modules**
   - **WatermelonDB**: Test offline sync + schema
   - **BLE**: Test SmartPad discovery + connection
   - **Firebase**: Test FCM push notifications
   - **Biometrics**: Test teacher login flow
   - **Keychain**: Test auth token storage

3. **Test core app flows**
   - Login → OTP → Dashboard
   - Attendance marking (with 30+ students)
   - Period transitions with animations
   - Offline → online sync
   - Push notification deep-linking

### Phase 5: Performance Validation (1 day)

1. **Benchmark before/after**
   ```bash
   # Cold start timing
   adb shell am start -W in.neuralife.teacher/.MainActivity
   
   # Memory usage
   adb shell dumpsys meminfo in.neuralife.teacher
   ```

2. **Animation smoothness**
   - Enable GPU rendering profile
   - Test entry animations on low-end device
   - Verify no frame drops in attendance marking

---

## 🧪 Testing Checklist

### Core Functionality
- [ ] Login with biometric fallback
- [ ] OTP verification with dev mode
- [ ] Dashboard KPI loading + refresh
- [ ] Period card animations + status updates
- [ ] Attendance marking (30+ students)
- [ ] Late arrival time picker
- [ ] Coverage marking flow
- [ ] Offline → online sync
- [ ] Digital signature generation

### Native Features
- [ ] BLE SmartPad discovery
- [ ] BLE device pairing + sync
- [ ] FCM push notifications
- [ ] Deep-linking from push
- [ ] Biometric authentication
- [ ] Haptic feedback on actions
- [ ] Background app refresh
- [ ] Cold start < 3 seconds

### Edge Cases
- [ ] Network loss during sync
- [ ] Battery optimization whitelist
- [ ] Android back button behavior
- [ ] Screen rotation (tablet landscape)
- [ ] Low memory scenarios
- [ ] Multiple notification handling

---

## 🚨 Rollback Plan

If critical issues found:

```bash
# 1. Revert to backup branch
git checkout main
git branch -D upgrade/react-native-085

# 2. Restore native files
rm -rf android/ && mv android_backup/ android/
rm -rf ios/ && mv ios_backup/ ios/

# 3. Restore package files
mv package.json.backup package.json
mv metro.config.js.backup metro.config.js

# 4. Clean install
pnpm install
cd android && ./gradlew clean
cd ../ios && pod install  # if iOS
```

---

## 📅 Recommended Timeline

| Phase | Duration | When to Execute |
|-------|----------|-----------------|
| Compatibility Audit | 2 days | During current development (non-blocking) |
| Environment Prep | 1 day | After Teacher Foundation complete |
| Core Upgrade | 2-3 days | Dedicated sprint |
| Dependency Updates | 3-4 days | Same sprint |
| Performance Testing | 1 day | Before production |
| **TOTAL** | **1-2 weeks** | **After current milestone** |

---

## ⚡ Alternative: Gradual New Architecture

If full upgrade seems risky, consider enabling New Architecture on current RN 0.74:

```bash
# Enable Fabric (new renderer)
echo "newArchEnabled=true" >> android/gradle.properties

# Enable TurboModules  
# android/app/src/main/java/MainApplication.java
@Override
protected boolean isNewArchEnabled() {
  return true;
}
```

This gives you ~70% of performance benefits with lower risk.

---

## 🎯 Success Metrics

After upgrade, expect:
- **Cold start**: < 2.5 seconds (from ~4s)
- **Attendance screen**: < 1 second to load 40 students
- **Memory usage**: < 200MB sustained (from ~270MB)
- **Frame rate**: Consistent 60fps during animations
- **Bundle size**: Smaller due to Hermes optimizations

---

## 🔗 References

- [React Native 0.85 Release](https://reactnative.dev/blog/2026/04/07/react-native-0.85)
- [New Architecture Performance](https://blog.swmansion.com/react-native-new-architecture-key-performance-boosts-4ce68cc3cc9f)
- [Upgrade Helper Tool](https://react-native-community.github.io/upgrade-helper/)
- [Hermes V1 Benefits](https://medium.com/@onix_react/release-react-native-0-84-677b3007b041)

---

**Next Steps:**
1. Continue current development until Teacher Foundation complete
2. Run compatibility audit during low-activity periods  
3. Schedule upgrade sprint after milestone delivery
4. Execute migration plan with dedicated testing time

*Last updated: June 2026*