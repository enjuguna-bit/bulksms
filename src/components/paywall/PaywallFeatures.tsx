import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Smartphone, BarChart2, Users, HelpCircle } from "lucide-react-native";
import { FeatureItem } from "../FeatureItem";

interface PaywallFeaturesProps {
    onPrioritySupportTap: () => void;
}

export function PaywallFeatures({ onPrioritySupportTap }: PaywallFeaturesProps) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionHeader}>What you get</Text>
            <View style={styles.featuresGrid}>
                <FeatureItem
                    icon={Smartphone}
                    title="Unlimited bulk SMS"
                    description="Send arrears reminders and officer updates."
                />
                <FeatureItem
                    icon={BarChart2}
                    title="Officer performance"
                    description="Track CR, PAR, and daily targets."
                />
                <FeatureItem
                    icon={Users}
                    title="Field officer friendly"
                    description="Designed for loan officers and managers."
                />
                <TouchableOpacity activeOpacity={0.8} onPress={onPrioritySupportTap}>
                    <FeatureItem
                        icon={HelpCircle}
                        title="Priority support & dev help"
                        description="Tap here. Hidden 5-tap unlocks dev bypass."
                        emphasis
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginTop: 18,
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: "700",
        color: "#e5e7eb",
        marginBottom: 8,
    },
    featuresGrid: {
        backgroundColor: "#020617",
        borderRadius: 18,
        padding: 12,
        borderWidth: 1,
        borderColor: "#1e293b",
        gap: 8,
    },
});
