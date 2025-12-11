# 🚀 Quick Test Reference Guide
**Last Updated**: December 10, 2025

---

## ⚡ Quick Commands

```bash
# Run all tests
npm test

# Watch mode (auto-rerun on changes)
npm test -- --watch

# Single file
npm test -- QueueTest

# With coverage
npm test -- --coverage

# Verbose output
npm test -- --verbose

# Update snapshots
npm test -- -u

# Run specific test by name
npm test -- --testNamePattern="payment"
```

---

## 📁 Test File Locations

```
Root Level Tests:
├── __tests__/
│   └── App.test.tsx              ✅ App initialization

Service Tests:
├── src/services/__tests__/
│   └── lipanaPayment.test.ts     ✅ Payment service
│   └── [ADD MORE HERE]

Feature Tests:
├── src/__tests__/
│   └── QueueTest.test.ts         ✅ SMS queue logic
│   └── [ADD MORE HERE]
```

---

## 🎯 Current Test Status

```
Total Tests:       5/5 passing (100%)
Test Suites:       3/3 passing (100%)
Execution Time:    8.6 seconds
Code Coverage:     ~10% (target: 80%)
```

---

## 📝 How to Add a New Test

### Step 1: Create File
```bash
src/services/__tests__/newfeature.test.ts
```

### Step 2: Write Test
```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('NewFeature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should work correctly', async () => {
    // Arrange
    const input = { value: 'test' };
    
    // Act
    const result = await featureFunction(input);
    
    // Assert
    expect(result).toEqual(expected);
  });

  it('should handle errors', () => {
    expect(() => featureFunction(null)).toThrow();
  });
});
```

### Step 3: Run Test
```bash
npm test -- newfeature.test.ts
```

---

## 🔧 Common Test Patterns

### Testing Async Functions
```typescript
it('should fetch data', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### Testing Error Handling
```typescript
it('should throw on invalid input', () => {
  expect(() => func(null)).toThrow();
});

it('should handle rejection', async () => {
  await expect(asyncFunc()).rejects.toThrow();
});
```

### Mocking Dependencies
```typescript
jest.mock('@/services/api', () => ({
  fetchData: jest.fn(async () => ({ success: true }))
}));

it('should call mock', async () => {
  const { fetchData } = require('@/services/api');
  await fetchData();
  expect(fetchData).toHaveBeenCalled();
});
```

### Clearing Mocks Between Tests
```typescript
beforeEach(() => {
  jest.clearAllMocks();
});
```

---

## 🎓 Available Mocks

### React Native APIs
```typescript
// Platform
Platform.OS = 'android'
Platform.select({ android: 'value', ios: 'other' })

// Permissions
PermissionsAndroid.request(...)
PermissionsAndroid.check(...)

// Screen Size
Dimensions.get('window') // Returns { width: 390, height: 844 }

// UI Manager
UIManager.setLayoutAnimationEnabledExperimental(true)
```

### Navigation
```typescript
useNavigation()           // Returns mock navigation object
useRoute()               // Returns mock route object
useFocusEffect(callback) // Calls callback immediately
```

### Storage
```typescript
AsyncStorage.setItem(key, value)
AsyncStorage.getItem(key)
AsyncStorage.removeItem(key)
AsyncStorage.clear()
```

### File System
```typescript
ReactNativeBlobUtil.fs.readFile(path)
ReactNativeBlobUtil.fs.writeFile(path, content)
RNFetchBlob.fs.readFile(path)
```

### Device Info
```typescript
getUniqueId()    // Returns 'test-device-id'
getDeviceId()    // Returns 'test-device'
getModel()       // Returns 'test-model'
```

---

## ✅ Test Checklist

Before running tests:
- [ ] All files saved
- [ ] No TypeScript errors
- [ ] No syntax errors
- [ ] Mocks are configured
- [ ] beforeEach clears mocks

When writing tests:
- [ ] Follow AAA pattern (Arrange-Act-Assert)
- [ ] Test success cases
- [ ] Test error cases
- [ ] Use clear test names
- [ ] Clear mocks in beforeEach
- [ ] Import expect and jest

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot find module X" | Add to transformIgnorePatterns in jest.config.js |
| "Mock not working" | Check jest.setup.js has proper mock |
| "Test times out" | Check async functions return Promises |
| "Mock calls not clearing" | Add `jest.clearAllMocks()` in beforeEach |
| "Module not mocked" | Add mock to jest.setup.js before other tests |

---

## 📊 Coverage Commands

```bash
# Generate coverage report
npm test -- --coverage

# Coverage thresholds
npm test -- --coverage --collectCoverageFrom='src/**/*.ts'

# HTML coverage report (run and open coverage/lcov-report/index.html)
npm test -- --coverage
open coverage/lcov-report/index.html
```

---

## 🎯 Priority Tests to Add

### Next Week (Week 1)
1. SMS Service Tests (sendSingleSms)
2. Message Sync Tests (importMessages)
3. Database Tests (CRUD ops)

### Next 2 Weeks (Week 2-3)
4. Navigation Tests
5. Provider Tests
6. Storage Tests

### Next Month (Month 2)
7. Hook Tests
8. Component Tests
9. E2E Tests

---

## 📚 Resources

### Jest Docs
- https://jestjs.io/docs/getting-started
- https://jestjs.io/docs/api
- https://jestjs.io/docs/mock-functions

### React Native Testing
- https://reactnative.dev/docs/testing-overview
- https://reactnative.dev/docs/testing

### TypeScript + Jest
- https://jestjs.io/docs/getting-started#using-typescript
- https://www.typescriptlang.org/docs/handbook/testing.html

---

## 🔑 Key Files

### Configuration
- `jest.config.js` - Jest configuration
- `jest.setup.js` - Global mocks and setup
- `tsconfig.json` - TypeScript configuration
- `babel.config.js` - Babel configuration

### Existing Tests
- `__tests__/App.test.tsx` - App initialization
- `src/__tests__/QueueTest.test.ts` - SMS queue logic
- `src/services/__tests__/lipanaPayment.test.ts` - Payment service

### Documentation
- `FUNCTIONALITY_TEST_REPORT.md` - Requirements
- `TEST_RESULTS_FINAL.md` - Current status
- `FUNCTIONALITY_CHECKLIST.md` - Feature checklist
- `TEST_STATUS_COMPLETE.md` - Executive summary

---

## 💡 Pro Tips

1. **Run tests before committing**
   ```bash
   npm test
   ```

2. **Use watch mode while developing**
   ```bash
   npm test -- --watch
   ```

3. **Test names should describe behavior**
   ```typescript
   // Good
   it('should return error when input is null')
   
   // Bad
   it('test function')
   ```

4. **Clear mocks between tests**
   ```typescript
   beforeEach(() => jest.clearAllMocks());
   ```

5. **Test both success and failure**
   ```typescript
   it('should succeed with valid input')
   it('should fail with invalid input')
   ```

---

## 🚀 Getting Help

1. Check if mock exists in `jest.setup.js`
2. Review similar test in `src/__tests__/`
3. Read error message carefully
4. Run with `--verbose` flag
5. Check Jest documentation

---

**Quick Access**: 
- Run tests: `npm test`
- Watch mode: `npm test -- --watch`
- Add mock: Edit `jest.setup.js`
- Create test: Copy existing pattern
- Get help: Check `FUNCTIONALITY_TEST_REPORT.md`
