// --------------------------------------------------------------
// 📁 src/utils/messageFormatters.ts
// Helpers for formatting message previews, timestamps, etc.
// --------------------------------------------------------------

import type { MessageRow } from "@/db/database";

/**
 * Clean preview text (single-line)
 */
export function messagePreview(body: string, max = 50): string {
    if (!body) return "";
    const clean = body.replace(/\s+/g, " ").trim();
    return clean.length > max ? clean.slice(0, max) + "…" : clean;
}

/**
 * Timestamp → readable
 */
export function formatTimestamp(ts: number): string {
    const d = new Date(ts);
    return (
        d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
}

/**
 * Compose display metadata for thread list.
 */
export function buildThreadDisplay(msg: MessageRow) {
    return {
        from: msg.address,
        preview: messagePreview(msg.body),
        time: formatTimestamp(msg.timestamp),
    };
}
