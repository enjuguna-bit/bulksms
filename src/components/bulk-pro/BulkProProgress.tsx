import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from "react-native";
import { useThemeSettings } from "@/theme/ThemeProvider";

interface AnimatedStatCardProps {
  value: number;
  label: string;
  color: string;
}

const AnimatedStatCard = ({ value, label, color }: AnimatedStatCardProps) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const animation = Animated.timing(animatedValue, {
      toValue: value,
      duration: 1500,
      easing: Easing.out(Easing.exp),
      useNativeDriver: false
    });
    
    animation.start();
    return () => animation.stop();
  }, [value, animatedValue]);

  const displayValue = animatedValue.interpolate({
    inputRange: [0, Math.max(value, 1)],
    outputRange: ['0', String(value)],
  });

  return (
    <View style={[styles.statCard, { backgroundColor: color }]}>
      <Animated.Text style={styles.statValue}>
        {displayValue}
      </Animated.Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

interface BulkProProgressProps {
  sending: boolean;
  sent: number;
  failed: number;
  queued: number;
  delivered: number; 
  total: number;
  paused: boolean;
  sendSpeed?: number;
  smsStatus?: "checking" | "ok" | "fail" | "unknown";
  onPauseResume: () => void;
  onStop: () => void;
  onSend: () => void;
  onRetry: () => void;
}

export default function BulkProProgress({
  sending,
  sent,
  failed,
  queued,
  delivered,
  total,
  paused,
  sendSpeed,
  smsStatus = "checking",
  onPauseResume,
  onStop,
  onSend,
  onRetry,
}: BulkProProgressProps) {
  const { colors } = useThemeSettings();
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  // Animate progress bar
  const progress = total > 0 ? (sent + failed) / total : 0;
  useEffect(() => {
    const animation = Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    });
    
    animation.start();
    return () => animation.stop();
  }, [progress, progressAnim]);
  
  // Calculate ETA
  const remaining = total - sent - failed;
  const speed = sendSpeed || 400;
  const etaSeconds = Math.ceil((remaining * speed) / 1000);
  const etaDisplay = etaSeconds > 60 
    ? `~${Math.ceil(etaSeconds / 60)} min` 
    : `~${etaSeconds}s`;
  
  const progressPercent = Math.round(progress * 100);
  const successRate = sent > 0 ? Math.round((sent / (sent + failed)) * 100) : 0;

  return (
    <View style={{ gap: 12 }}>
      {/* SMS Capability Warning */}
      {smsStatus === "fail" && (
        <View style={[styles.warningCard, { backgroundColor: "#fef3c7", borderColor: "#f59e0b" }]}>
          <Text style={[styles.warningText, { color: "#92400e" }]}>
            ⚠️ Full SMS functionality unavailable. App needs all SMS permissions and default SMS handler status to send messages and receive delivery reports.
          </Text>
        </View>
      )}

      <View style={[styles.card, { backgroundColor: sending ? "#ecfeff" : colors.card, borderColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {sending ? (paused ? "⏸️ Paused" : "📤 Sending...") : "Ready to Send"}
          </Text>
          {sending && remaining > 0 && (
            <Text style={[styles.eta, { color: colors.subText }]}>
              ETA: {etaDisplay}
            </Text>
          )}
        </View>
        
        {/* Progress Bar */}
        {total > 0 && (
          <View style={[styles.progressContainer, { backgroundColor: colors.border }]}>
            <Animated.View 
              style={[
                styles.progressBar, 
                { 
                  backgroundColor: failed > sent ? '#ef4444' : '#16a34a',
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  })
                }
              ]} 
            />
          </View>
        )}
        
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <AnimatedStatCard value={total} label="Total" color={colors.card} />
          <AnimatedStatCard value={sent} label="Sent" color="#16a34a" />
          <AnimatedStatCard value={delivered} label="Delivered" color="#06b6d4" />
          <AnimatedStatCard value={failed} label="Failed" color="#ef4444" />
          {queued > 0 && (
            <AnimatedStatCard value={queued} label="Queued" color="#f59e0b" />
          )}
        </View>
        
        {/* Progress Text */}
        {sending && (
          <Text style={[styles.progressText, { color: colors.subText }]}>
            {progressPercent}% complete • {successRate}% success rate • 
            {delivered > 0 ? Math.round((delivered/sent)*100) : 0}% delivered
          </Text>
        )}
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        {!sending && (
          <TouchableOpacity
            onPress={onSend}
            disabled={total === 0}
            style={[styles.btn, { backgroundColor: "#16a34a", opacity: total === 0 ? 0.6 : 1 }]}
          >
            <Text style={styles.btnText}>📤 Send</Text>
          </TouchableOpacity>
        )}
        {sending && (
          <>
            <TouchableOpacity
              onPress={onPauseResume}
              style={[styles.btn, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.btnText}>{paused ? "Resume" : "Pause"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onStop}
              style={[styles.btn, { backgroundColor: "#ef4444" }]}
            >
              <Text style={styles.btnText}>Stop</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {!sending && (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.accent }]}
          onPress={onRetry}
        >
          <Text style={styles.btnText}>🔁 Retry Pending Queue</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  warningCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { fontWeight: "800" },
  eta: { fontSize: 12, fontWeight: '600' },
  progressContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  statCard: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  btn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "800" },
});
