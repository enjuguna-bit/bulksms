/**
 * ⏰ SchedulerService.ts
 * Manages scheduled SMS messages (insert, cancel, process due).
 */

import { runQuery } from "@/db/database/core";
import { UnifiedMessageManager } from "./unifiedMessageService";
import Logger from "@/utils/logger";

export interface ScheduledMessage {
    id: number;
    address: string;
    body: string;
    scheduledTime: number;
    status: 'pending' | 'sent' | 'failed' | 'cancelled';
    createdAt: number;
}

export const SchedulerService = {

    /**
     * Schedule a message for future delivery
     */
    async scheduleMessage(address: string, body: string, scheduledTime: number): Promise<number> {
        try {
            const res = await runQuery(
                `INSERT INTO scheduled_sms (address, body, scheduledTime, createdAt, status) VALUES (?, ?, ?, ?, 'pending')`,
                [address, body, scheduledTime, Date.now()]
            );
            return res.insertId;
        } catch (error) {
            Logger.error("Scheduler", "Failed to schedule message", error);
            throw error;
        }
    },

    /**
     * Get all pending scheduled messages
     */
    async getPendingMessages(): Promise<ScheduledMessage[]> {
        const res = await runQuery(
            `SELECT * FROM scheduled_sms WHERE status = 'pending' ORDER BY scheduledTime ASC`
        );
        const messages: ScheduledMessage[] = [];
        for (let i = 0; i < res.rows.length; i++) {
            messages.push(res.rows.item(i));
        }
        return messages;
    },

    /**
     * Cancel a scheduled message
     */
    async cancelMessage(id: number): Promise<boolean> {
        const res = await runQuery(
            `UPDATE scheduled_sms SET status = 'cancelled' WHERE id = ?`,
            [id]
        );
        return res.rowsAffected > 0;
    },

    /**
     * Delete a message permanently
     */
    async deleteMessage(id: number): Promise<boolean> {
        const res = await runQuery(
            `DELETE FROM scheduled_sms WHERE id = ?`,
            [id]
        );
        return res.rowsAffected > 0;
    },

    /**
     * Process messages that are due now
     * Call this from Background Fetch and App Resume
     */
    async processDueMessages(): Promise<number> {
        const now = Date.now();
        Logger.info("Scheduler", "Checking for due messages...");

        try {
            // Find messages scheduled for <= now that are pending
            const res = await runQuery(
                `SELECT * FROM scheduled_sms WHERE status = 'pending' AND scheduledTime <= ?`,
                [now]
            );

            if (res.rows.length === 0) {
                Logger.info("Scheduler", "No due messages found.");
                return 0;
            }

            let processedCount = 0;

            for (let i = 0; i < res.rows.length; i++) {
                const msg: ScheduledMessage = res.rows.item(i);

                Logger.info("Scheduler", `Processing due message ID ${msg.id} to ${msg.address}`);

                // Send via Unified Pipeline
                const result = await UnifiedMessageManager.sendMessage({
                    address: msg.address,
                    body: msg.body,
                });

                // Update status based on result
                const newStatus = result.success ? 'sent' : 'failed';
                await runQuery(
                    `UPDATE scheduled_sms SET status = ? WHERE id = ?`,
                    [newStatus, msg.id]
                );

                if (result.success) processedCount++;
            }

            return processedCount;

        } catch (error) {
            Logger.error("Scheduler", "Error processing due messages", error);
            return 0;
        }
    }
};
