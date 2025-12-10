import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";

type State = {
  hasError: boolean;
  message?: string;
  stack?: string;
};

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: any): State {
    return { hasError: true, message: String(err) };
  }

  componentDidCatch(err: any, info: any) {
    console.warn("🔴 Route error:", err, info);
    this.setState({
      stack: err?.stack ? String(err.stack).split("\n").slice(0, 5).join("\n") : undefined,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: undefined, stack: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: "center", padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", textAlign: "center" }}>
            Something went wrong
          </Text>
          {this.state.message && (
            <Text
              style={{
                marginTop: 8,
                color: "#666",
                textAlign: "center",
              }}
            >
              {this.state.message}
            </Text>
          )}
          {__DEV__ && this.state.stack && (
            <ScrollView style={{ marginTop: 12 }}>
              <Text style={{ color: "#999", fontSize: 12, fontFamily: "monospace" }}>
                {this.state.stack}
              </Text>
            </ScrollView>
          )}
          <TouchableOpacity
            onPress={this.handleRetry}
            style={{
              marginTop: 20,
              backgroundColor: "#2563eb",
              paddingVertical: 12,
              paddingHorizontal: 20,
              borderRadius: 8,
              alignSelf: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
