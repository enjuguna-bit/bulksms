# Premium UI Components

A comprehensive collection of premium React Native UI components for the Bulk SMS application, designed with accessibility, performance, and modern UX principles in mind.

## 🎨 UI Components

### Card Component
A versatile card component with multiple variants and enhanced interactions.

**Features:**
- Multiple variants: `default`, `elevated`, `outlined`, `pressable`
- Gradient background support
- Configurable shadows: `sm`, `md`, `lg`, `xl`
- Pressable interactions with haptic feedback
- Full theme integration

**Usage:**
```tsx
import { Card } from '@/components/ui';

// Basic card
<Card>
  <Text>Card content</Text>
</Card>

// Pressable card with gradient
<Card
  variant="pressable"
  gradient={colors.gradientPrimary}
  onPress={() => console.log('pressed')}
  shadow="lg"
>
  <Text>Premium gradient card</Text>
</Card>
```

### Button Component
Enhanced button component with gradient support and accessibility features.

**Features:**
- Variants: `primary`, `secondary`, `outline`, `ghost`, `gradient`
- Multiple sizes: `sm`, `md`, `lg`
- Loading states with activity indicators
- Gradient backgrounds
- Full accessibility support
- Custom gradient colors

**Usage:**
```tsx
import { Button } from '@/components/ui';

// Primary button
<Button title="Submit" onPress={handleSubmit} />

// Gradient button
<Button
  title="Premium Action"
  variant="gradient"
  gradient={['#667eea', '#764ba2']}
  onPress={handlePremiumAction}
  accessibilityLabel="Perform premium action"
/>
```

### Toast & ToastProvider
Advanced toast notification system with rich interactions.

**Features:**
- Multiple types: `success`, `error`, `warning`, `info`
- Position options: `top`, `bottom`, `center`
- Swipe-to-dismiss functionality
- Progress indicators for auto-dismiss
- Stacking support for multiple toasts
- Smooth animations

**Usage:**
```tsx
import { ToastProvider, useToast } from '@/components/ui';

// In your app root
<ToastProvider>
  <App />
</ToastProvider>

// In components
const { showSuccess, showError, showWarning, showInfo } = useToast();

showSuccess('Operation completed!', 3000, 'top', true);
showError('Something went wrong', 5000, 'center', false);
```

### Badge Component
Compact badge component for status indicators and labels.

**Features:**
- Variants: `default`, `success`, `error`, `warning`, `info`
- Multiple sizes: `sm`, `md`, `lg`
- Theme-aware colors
- Auto-sizing based on content

**Usage:**
```tsx
import { Badge } from '@/components/ui';

<Badge variant="success" size="md">Active</Badge>
<Badge variant="error" size="sm">Error</Badge>
```

## 🛠 Shared Components

### EmptyState Component
Consistent empty state displays with contextual icons and messaging.

**Types:**
- `logs` - For message logs
- `messages` - For message lists
- `contacts` - For contact lists
- `generic` - For general empty states

### LoadingSpinner Component
Standardized loading indicator with theme integration.

**Features:**
- Size options: `small`, `large`
- Custom color support
- Theme-aware default colors

## 🔧 Custom Hooks

### useOptimizedList
Optimizes FlatList performance with memoization and efficient rendering.

**Features:**
- Memoized data and render items
- Optimized FlatList props
- Item layout support for fixed heights

### useDebounce
Debounces value changes for search inputs and API calls.

### useLocalStorage
Persistent state management with AsyncStorage.

**Features:**
- Type-safe storage
- Async getter/setter
- Error handling
- Loading states

### Additional Hooks
- `useAppLock` - Application lock functionality
- `useBulkPro` - Premium features management
- `useMessages` - Message state management
- `useNativeSms` - Native SMS integration
- `usePaymentCapture` - Payment processing
- `useRole` - Role-based access control
- `useSafeRouter` - Safe navigation
- `useTrial` - Trial period management

## 🎯 Theme Integration

All components are fully integrated with the theme system:

- **Colors**: Automatic dark/light mode support
- **Shadows**: Consistent shadow system
- **Gradients**: Premium gradient definitions
- **Typography**: Consistent text styling
- **Accessibility**: High contrast and large text support

## 📱 Performance Features

- **Memoization**: Components optimized to prevent unnecessary re-renders
- **Lazy Loading**: Components load only when needed
- **Efficient Animations**: Native driver for smooth 60fps animations
- **Optimized Lists**: Efficient FlatList rendering for large datasets

## ♿ Accessibility

- **Screen Reader Support**: All components include proper accessibility labels
- **Keyboard Navigation**: Full keyboard navigation support
- **High Contrast**: Automatic high contrast mode support
- **Large Text**: Dynamic text sizing support
- **Focus Management**: Proper focus handling for interactive elements

## 🔄 Best Practices

1. **Consistent Usage**: Use the provided components for consistency
2. **Theme Awareness**: All components automatically adapt to theme changes
3. **Performance**: Leverage optimized hooks for better performance
4. **Accessibility**: Always provide accessibility labels for interactive elements
5. **Error Handling**: Components include built-in error boundaries and fallbacks

## 📦 Installation

All components are part of the Bulk SMS project and are available through the internal module system:

```tsx
import { Card, Button, ToastProvider } from '@/components/ui';
import { EmptyState, LoadingSpinner } from '@/components/shared';
import { useOptimizedList, useDebounce } from '@/components/hooks';
```
