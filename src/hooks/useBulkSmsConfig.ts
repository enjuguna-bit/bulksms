import { useState } from "react";

/**
 * Hook for managing bulk SMS sending configuration
 * Handles send speed, SIM slot selection, and other sending preferences
 */
export function useBulkSmsConfig() {
    const [sendSpeed, setSendSpeed] = useState(400); // ms between messages
    const [simSlot, setSimSlot] = useState(0); // Default SIM slot
    const [currentBulkId, setCurrentBulkId] = useState<string | null>(null);

    // Generate unique bulk ID for campaign tracking
    const generateBulkId = () => {
        const bulkId = `blk_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        setCurrentBulkId(bulkId);
        return bulkId;
    };

    const resetBulkId = () => {
        setCurrentBulkId(null);
    };

    return {
        sendSpeed,
        setSendSpeed,
        simSlot,
        setSimSlot,
        currentBulkId,
        generateBulkId,
        resetBulkId,
    };
}
