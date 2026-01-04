// ------------------------------------------------------
// 📤 src/components/bulk-pro/SessionManager.tsx
// Visual component for managing active upload sessions
// Shows session banner with resume/discard options
// ------------------------------------------------------

import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
} from "react-native";
import { useThemeSettings } from "@/theme/ThemeProvider";
import type { ExcelUploadData } from "@/types/bulkSms";

interface SessionManagerProps {
    /** Active session data */
    sessionData: ExcelUploadData;
    /** Resume button pressed */
    onResume: () => void;
    /** Discard button pressed */
    onDiscard: () => void;
    /** Is the resume action in progress */
    isLoading?: boolean;
}

/**
 * SessionManager - Banner component showing active upload session
 * Allows user to resume or discard a previous upload
 */
export const SessionManager: React.FC<SessionManagerProps> = ({
    sessionData,
    onResume,
    onDiscard,
    isLoading = false,
}) => {
    const { colors } = useThemeSettings();

    // Format the upload time
    const uploadTime = new Date(sessionData.uploadTimestamp).toLocaleString();

    // Calculate time ago
    const getTimeAgo = (): string => {
        const diffMs = Date.now() - sessionData.uploadTimestamp;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);

        if (diffHours > 0) {
            return `${diffHours}h ${diffMins % 60}m ago`;
        }
        return `${diffMins}m ago`;
    };

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: colors.card,
                    borderColor: colors.accent,
                },
            ]}
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.icon]}>📎</Text>
                <Text style={[styles.title, { color: colors.text }]}>
                    Active Upload Session
                </Text>
            </View>

            {/* Session Details */}
            <View style={styles.details}>
                <Text style={[styles.fileName, { color: colors.text }]}>
                    {sessionData.fileName}
                </Text>
                <Text style={[styles.stats, { color: colors.subText }]}>
                    {sessionData.validRecords} valid contacts • {getTimeAgo()}
                </Text>
                {sessionData.invalidRecords > 0 && (
                    <Text style={[styles.warning, { color: "#f59e0b" }]}>
                        ⚠️ {sessionData.invalidRecords} invalid records skipped
                    </Text>
                )}
            </View>

            {/* Status Badge */}
            <View
                style={[
                    styles.statusBadge,
                    {
                        backgroundColor:
                            sessionData.processingStatus === "processed"
                                ? "#16a34a20"
                                : "#f59e0b20",
                    },
                ]}
            >
                <Text
                    style={[
                        styles.statusText,
                        {
                            color:
                                sessionData.processingStatus === "processed"
                                    ? "#16a34a"
                                    : "#f59e0b",
                        },
                    ]}
                >
                    {sessionData.processingStatus === "processed"
                        ? "Ready to send"
                        : "Processing..."}
                </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.resumeButton, { backgroundColor: colors.accent }]}
                    onPress={onResume}
                    disabled={isLoading}
                >
                    <Text style={styles.resumeButtonText}>
                        {isLoading ? "Loading..." : "Resume"}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.discardButton,
                        { backgroundColor: "#ef444420", borderColor: "#ef4444" },
                    ]}
                    onPress={onDiscard}
                    disabled={isLoading}
                >
                    <Text style={[styles.discardButtonText, { color: "#ef4444" }]}>
                        Discard
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Timestamp */}
            <Text style={[styles.timestamp, { color: colors.subText }]}>
                Uploaded: {uploadTime}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        marginBottom: 12,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    icon: {
        fontSize: 18,
        marginRight: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: "700",
    },
    details: {
        marginBottom: 10,
    },
    fileName: {
        fontSize: 14,
        fontWeight: "600",
    },
    stats: {
        fontSize: 12,
        marginTop: 2,
    },
    warning: {
        fontSize: 11,
        marginTop: 4,
    },
    statusBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "600",
    },
    actions: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 8,
    },
    resumeButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
    },
    resumeButtonText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 14,
    },
    discardButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
        borderWidth: 1,
    },
    discardButtonText: {
        fontWeight: "700",
        fontSize: 14,
    },
    timestamp: {
        fontSize: 10,
        textAlign: "center",
    },
});

export default SessionManager;
