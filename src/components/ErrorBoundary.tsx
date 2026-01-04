import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { errorTracking } from "@/services/errorTracking";
import { classifyAppError, AppError, AppErrorType, RecoveryAction } from "@/utils/errors/AppErrors";
import { ErrorScreen } from "./errors/ErrorScreen";

type State = {
  hasError: boolean;
  error?: AppError;
};

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: any): State {
    // Classify the error
    const appError = classifyAppError(err, {
      extra: {
        boundaryType: 'route',
      },
    });

    // Override type if clearly a UI error
    if (appError.type === AppErrorType.UNKNOWN) {
      appError.type = AppErrorType.UI_RENDER_ERROR;
    }

    return { hasError: true, error: appError };
  }

  componentDidCatch(err: any, info: any) {
    console.warn("🔴 Route error:", err, info);

    // Report error with context
    if (this.state.error) {
      errorTracking.reportError({
        ...this.state.error,
        context: {
          extra: {
            ...this.state.error.context?.extra,
            componentStack: info.componentStack,
          },
          breadcrumbs: this.state.error.context?.breadcrumbs || [],
          ...this.state.error.context,
        },
      });
    }
  }

  handleRecover = (action: RecoveryAction) => {
    switch (action) {
      case RecoveryAction.RETRY_LAST_ACTION:
        // Reset error boundary
        this.setState({ hasError: false, error: undefined });
        break;

      case RecoveryAction.CLEAR_CACHE:
        // TODO: Implement cache clearing
        console.log('[ErrorBoundary] Clearing cache...');
        this.setState({ hasError: false, error: undefined });
        break;

      case RecoveryAction.RELOAD_APP:
        // TODO: Implement app reload (react-native-restart)
        console.log('[ErrorBoundary] Reloading app...');
        // RNRestart.Restart();
        break;

      case RecoveryAction.DISMISS:
        this.setState({ hasError: false, error: undefined });
        break;

      default:
        this.setState({ hasError: false, error: undefined });
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return <ErrorScreen error={this.state.error} onRecover={this.handleRecover} />;
    }

    return this.props.children;
  }
}
