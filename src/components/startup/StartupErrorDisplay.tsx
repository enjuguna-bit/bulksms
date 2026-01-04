import React from "react";
import { View, Text, StyleSheet, Button, Linking } from "react-native";
import { getRecoveryStrategy, getActionLabel, AppError } from "@/utils/errors/AppErrors";
import { RetryContext } from "@/services/StartupErrorManager";

interface StartupErrorDisplayProps {
  initError: AppError;
  isOffline: boolean;
  retryContext: RetryContext | null;
  onRetry: () => void;
}

// Helper to get severity style
function getSeverityStyle(severity: string) {
  switch (severity) {
    case 'CRITICAL':
      return styles.severityCritical;
    case 'HIGH':
      return styles.severityHigh;
    case 'MEDIUM':
      return styles.severityMedium;
    case 'LOW':
      return styles.severityLow;
    default:
      return styles.severityMedium;
  }
}

export function StartupErrorDisplay({
  initError,
  isOffline,
  retryContext,
  onRetry
}: StartupErrorDisplayProps) {
  const recovery = getRecoveryStrategy(initError);
  const primaryActionLabel = getActionLabel(recovery.primary);

  return (
    <View style={styles.center}>
      {/* Error Title with Severity */}
      <Text style={styles.errorTitle}>
        {isOffline ? '📡 No Connection' : '⚠️ Startup Failed'}
      </Text>

      {/* Error Message */}
      <Text style={styles.errorMessage}>{initError.message}</Text>

      {/* Severity Badge */}
      <View style={[styles.severityBadge, getSeverityStyle(initError.severity)]}>
        <Text style={styles.severityText}>{initError.severity}</Text>
      </View>

      {/* Retry Context */}
      {retryContext && (
        <Text style={styles.retryInfo}>
          Attempt {retryContext.attempt} - Next retry in {Math.round(retryContext.nextDelayMs / 1000)}s
        </Text>
      )}

      {/* Recovery Description */}
      <Text style={styles.recoveryDescription}>{recovery.description}</Text>

      {/* Debug Info (Dev Mode Only) */}
      {__DEV__ && initError.stack && (
        <Text style={styles.errorStack}>
          {initError.stack.split('\n').slice(0, 3).join('\n')}
        </Text>
      )}

      <View style={styles.spacer} />

      {/* Primary Action */}
      <Button title={primaryActionLabel} onPress={onRetry} />

      {/* Secondary Actions */}
      {recovery.secondary && recovery.secondary.length > 0 && (
        <View style={styles.secondaryActions}>
          {recovery.secondary.slice(0, 2).map((action, idx) => (
            <Button
              key={idx}
              title={getActionLabel(action)}
              onPress={() => {
                // Execute secondary action
                if (action === 'OPEN_SETTINGS') {
                  Linking.openSettings();
                } else if (action === 'DISMISS') {
                  // Handle dismiss - could be passed as prop if needed
                }
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
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
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  severityText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  severityCritical: {
    backgroundColor: '#dc2626',
  },
  severityHigh: {
    backgroundColor: '#ea580c',
  },
  severityMedium: {
    backgroundColor: '#f59e0b',
  },
  severityLow: {
    backgroundColor: '#84cc16',
  },
  retryInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  recoveryDescription: {
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  secondaryActions: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
});
