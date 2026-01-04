import React from "react";
import { View, Text, StyleSheet, Button } from "react-native";

type StartupBoundaryState = {
  hasError: boolean;
  errorMessage?: string;
  errorStack?: string;
};

class StartupBoundary extends React.Component<
  React.PropsWithChildren,
  StartupBoundaryState
> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown): StartupBoundaryState {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    return {
      hasError: true,
      errorMessage,
      errorStack: errorStack?.split('\n').slice(0, 5).join('\n') // First 5 lines of stack
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("[StartupBoundary] Unhandled error:", error, info);
    // Log full error details for debugging
    if (error instanceof Error) {
      console.error("[StartupBoundary] Error message:", error.message);
      console.error("[StartupBoundary] Error stack:", error.stack);
    }
    console.error("[StartupBoundary] Component stack:", info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: undefined, errorStack: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Critical Startup Error</Text>
          {this.state.errorMessage && (
            <Text style={styles.errorMessage}>{this.state.errorMessage}</Text>
          )}
          {__DEV__ && this.state.errorStack && (
            <Text style={styles.errorStack}>{this.state.errorStack}</Text>
          )}
          <View style={styles.spacer} />
          <Button title="Retry" onPress={this.handleRetry} />
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ef4444",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  errorStack: {
    fontSize: 11,
    color: "#999",
    fontFamily: "monospace",
    marginTop: 8,
    marginBottom: 12,
    textAlign: "left",
    maxWidth: "100%",
  },
  spacer: {
    height: 10,
  },
});

export default StartupBoundary;
