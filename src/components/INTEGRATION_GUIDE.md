# Enhanced UI Components Integration Guide

## Quick Start

### 1. Import Components
```tsx
import { 
  Card, 
  Button, 
  Badge, 
  ToastProvider, 
  useToast 
} from '@/components/ui';

import { 
  EmptyState, 
  LoadingSpinner 
} from '@/components/shared';

import { 
  useLocalStorage, 
  useDebounce, 
  useOptimizedList 
} from '@/hooks';
```

### 2. Setup Toast Provider
```tsx
// In your App.tsx or root component
export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </ToastProvider>
    </ThemeProvider>
  );
}
```

### 3. Use Enhanced Components
```tsx
function MyComponent() {
  const { showSuccess, showError } = useToast();
  const [settings, setSettings] = useLocalStorage('settings', { theme: 'light' });

  return (
    <Card variant="elevated" shadow="lg">
      <Button 
        variant="gradient" 
        gradient={['#667eea', '#764ba2']}
        onPress={() => showSuccess('Action completed!')}
      >
        Premium Action
      </Button>
      <Badge variant="success" size="md">Active</Badge>
    </Card>
  );
}
```

## Component API Reference

### Toast System
```tsx
const { 
  showSuccess, 
  showError, 
  showWarning, 
  showInfo, 
  showToast, 
  clearAllToasts 
} = useToast();

// Usage examples
showSuccess('Success message', 3000, 'top', true);
showError('Error occurred', 5000, 'bottom', false);
showInfo('Info message', 2500, 'center', true);
clearAllToasts(); // Dismiss all active toasts
```

### Card Component
```tsx
<Card
  variant="pressable"           // default | elevated | outlined | pressable
  shadow="lg"                   // sm | md | lg | xl
  gradient={colors.gradientSuccess}  // Optional gradient colors
  onPress={() => console.log('pressed')}
  onLongPress={() => console.log('long pressed')}
  disabled={false}
  style={customStyle}
>
  <Text>Card content</Text>
</Card>
```

### Button Component
```tsx
<Button
  title="Button Text"
  variant="gradient"            // primary | secondary | outline | ghost | gradient
  size="lg"                     // sm | md | lg
  gradient={['#667eea', '#764ba2']}  // Custom gradient
  loading={false}
  disabled={false}
  onPress={handlePress}
  accessibilityLabel="Perform action"
  accessibilityHint="This will submit the form"
  style={customStyle}
/>
```

### Badge Component
```tsx
<Badge
  variant="success"             // default | success | error | warning | info
  size="md"                     // sm | md | lg
  style={customStyle}
>
  Badge Text
</Badge>
```

## Performance Tips

### 1. Use Optimized Lists
```tsx
const listProps = useOptimizedList({
  data: items,
  renderItem: ({ item }) => <ItemComponent item={item} />,
  keyExtractor: (item) => item.id,
  itemHeight: 60  // Fixed height for better performance
});

<FlatList {...listProps} />
```

### 2. Debounce Search Inputs
```tsx
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 300);

useEffect(() => {
  if (debouncedSearch) {
    performSearch(debouncedSearch);
  }
}, [debouncedSearch]);
```

### 3. Persistent State
```tsx
const [userPreferences, setUserPreferences] = useLocalStorage('userPrefs', {
  notifications: true,
  theme: 'dark'
});

// Automatically saves to AsyncStorage
setUserPreferences(prev => ({ ...prev, notifications: false }));
```

## Theme Integration

All components automatically use the theme system:

```tsx
const { colors } = useThemeSettings();

// Access theme gradients
colors.gradientPrimary  // ["#667eea", "#764ba2"]
colors.gradientSuccess  // ["#16a34a", "#15803d"]
colors.gradientError    // ["#dc2626", "#b91c1c"]

// Access theme shadows
colors.shadow.sm        // Small shadow
colors.shadow.md        // Medium shadow
colors.shadow.lg        // Large shadow
colors.shadow.xl        // Extra large shadow
```

## Accessibility Best Practices

### 1. Screen Reader Support
```tsx
<Button
  title="Submit Form"
  accessibilityLabel="Submit registration form"
  accessibilityHint="This will create your account and send confirmation email"
  accessibilityRole="button"
  accessibilityState={{ disabled: isSubmitting }}
  onPress={handleSubmit}
/>
```

### 2. High Contrast Mode
Components automatically adapt to high contrast mode through the theme system.

### 3. Large Text Support
Text sizing automatically adjusts based on user preferences.

## Migration Guide

### From Basic Components
```tsx
// Before
<View style={styles.card}>
  <Text>Content</Text>
</View>

// After
<Card variant="default">
  <Text>Content</Text>
</Card>
```

### From Basic Buttons
```tsx
// Before
<TouchableOpacity onPress={handlePress}>
  <Text>Press me</Text>
</TouchableOpacity>

// After
<Button title="Press me" onPress={handlePress} variant="primary" />
```

## Troubleshooting

### Common Issues

1. **Gradient not showing**: Ensure `expo-linear-gradient` is installed
2. **Toast not appearing**: Make sure `ToastProvider` wraps your app
3. **TypeScript errors**: Check that all required props are provided
4. **Performance issues**: Use `useOptimizedList` for large lists

### Debug Mode
Enable debug logging to track component behavior:
```tsx
// In development
if (__DEV__) {
  console.log('Component rendered:', props);
}
```

## Examples

See `ComponentShowcase.tsx` for comprehensive examples of all enhanced components in action.

## Support

For issues or questions about the enhanced components:
1. Check the integration guide
2. Review the ComponentShowcase examples
3. Consult the main README documentation
4. Check TypeScript types for available props
