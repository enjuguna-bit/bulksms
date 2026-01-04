import { runQuery, executeTransaction } from '../database/core';
import { CAMPAIGN_SCHEMA } from './schema';

export interface Campaign {
    id: number;
    name: string;
    status: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused' | 'failed';
    totalRecipients: number;
    sentCount: number;
    deliveredCount: number;
    failedCount: number;
    createdAt: number;
    updatedAt: number;
    scheduledAt?: number;
    variantsConfig?: Record<string, string>; // Variant ID -> Message Body
}

export async function createCampaign(
    name: string,
    totalRecipients: number,
    variantsConfig?: Record<string, string>,
    scheduledAt?: number
): Promise<Campaign> {
    const now = Date.now();
    const variantsJson = variantsConfig ? JSON.stringify(variantsConfig) : null;

    const result = await runQuery(
        `INSERT INTO bulk_campaigns 
    (name, status, total_recipients, created_at, updated_at, scheduled_at, variants_config)
    VALUES (?, 'draft', ?, ?, ?, ?, ?)`,
        [name, totalRecipients, now, now, scheduledAt || null, variantsJson]
    );

    return {
        id: result.insertId,
        name,
        status: 'draft',
        totalRecipients,
        sentCount: 0,
        deliveredCount: 0,
        failedCount: 0,
        createdAt: now,
        updatedAt: now,
        scheduledAt,
        variantsConfig
    };
}

export async function updateCampaignStatus(
    id: number,
    status: Campaign['status']
): Promise<void> {
    await runQuery(
        'UPDATE bulk_campaigns SET status = ?, updated_at = ? WHERE id = ?',
        [status, Date.now(), id]
    );
}

export async function incrementCampaignStats(
    id: number,
    type: 'sent' | 'delivered' | 'failed',
    count: number = 1
): Promise<void> {
    // Use a direct update to be concurrency-safe-ish for counters
    const column = type === 'sent' ? 'sent_count'
        : type === 'delivered' ? 'delivered_count'
            : 'failed_count';

    await runQuery(
        `UPDATE bulk_campaigns SET ${column} = ${column} + ?, updated_at = ? WHERE id = ?`,
        [count, Date.now(), id]
    );
}

export async function getCampaigns(limit: number = 20, offset: number = 0): Promise<Campaign[]> {
    const result = await runQuery(
        'SELECT * FROM bulk_campaigns ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [limit, offset]
    );

    return result.rows.raw().map((row: any) => ({
        id: row.id,
        name: row.name,
        status: row.status,
        totalRecipients: row.total_recipients,
        sentCount: row.sent_count,
        deliveredCount: row.delivered_count,
        failedCount: row.failed_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        scheduledAt: row.scheduled_at,
        variantsConfig: row.variants_config ? JSON.parse(row.variants_config) : undefined
    }));
}

export async function getCampaignStats(id: number): Promise<any> {
    // Basic stats are in the campaign table
    const result = await runQuery('SELECT * FROM bulk_campaigns WHERE id = ?', [id]);
    if (result.rows.length === 0) return null;
    const campaign = result.rows.item(0);

    // If A/B testing, getting breakdown by variant requires querying conversation_messages
    // This assumes we have added campaign_id and variant_id to messages
    let variantStats: Record<string, any> = {};
    if (campaign.variants_config) {
        const variants = JSON.parse(campaign.variants_config);
        const variantIds = Object.keys(variants);

        // This query might be slow on huge datasets without an index on variant_id
        // Ensure index is added in schema
        /*
          SELECT variant_id, status, COUNT(*) as count 
          FROM conversation_messages 
          WHERE campaign_id = ? 
          GROUP BY variant_id, status
        */
        const statsResult = await runQuery(
            `SELECT variant_id, status, COUNT(*) as count 
             FROM conversation_messages 
             WHERE campaign_id = ? 
             GROUP BY variant_id, status`,
            [id]
        );

        const rawStats = statsResult.rows.raw();
        // Process rawStats into a structured object
        // e.g. { "A": { sent: 10, failed: 1 }, "B": { sent: 12, failed: 0 } }
        variantIds.forEach((vid: string) => {
            variantStats[vid] = { sent: 0, failed: 0, delivered: 0 };
            rawStats.filter((r: any) => r.variant_id === vid).forEach((r: any) => {
                if (r.status === 'sent') variantStats[vid].sent += r.count;
                if (r.status === 'failed') variantStats[vid].failed += r.count;
                if (r.status === 'delivered') variantStats[vid].delivered += r.count;
            });
        });
    }

    return {
        ...campaign,
        variantStats
    };
}
