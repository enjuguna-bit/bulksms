declare module 'react-native-haptic-feedback' {
  export type HapticFeedbackTypes =
    | 'impactLight'
    | 'impactMedium'
    | 'impactHeavy'
    | 'notificationSuccess'
    | 'notificationWarning'
    | 'notificationError'
    | 'selection';

  export interface HapticOptions {
    enableVibrateFallback?: boolean;
    ignoreAndroidSystemSettings?: boolean;
  }

  export default class ReactNativeHapticFeedback {
    static trigger(
      type: HapticFeedbackTypes,
      options?: HapticOptions
    ): void;
  }
}
