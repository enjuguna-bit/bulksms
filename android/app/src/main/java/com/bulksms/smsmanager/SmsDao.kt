package com.bulksms.smsmanager

import androidx.room.*

@Dao
interface SmsDao {
    // 1. Bulk Insert (Fast)
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(messages: List<SmsEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(sms: SmsEntity)

    // 2. Fetch the next pending message (FIFO)
    @Query("SELECT * FROM sms_queue WHERE status = 0 ORDER BY created_at ASC LIMIT 1")
    suspend fun getNextPendingMessage(): SmsEntity?

    // 3. Update Status
    @Query("UPDATE sms_queue SET status = :newStatus, updated_at = :timestamp WHERE id = :id")
    suspend fun updateStatus(id: Long, newStatus: Int, timestamp: Long = System.currentTimeMillis())

    // 4. Log Failure
    @Query("UPDATE sms_queue SET status = 4, error_message = :error WHERE id = :id")
    suspend fun markAsFailed(id: Long, error: String)
    
    // 5. Analytics: Check daily usage to avoid bundle exhaustion
    @Query("SELECT COUNT(*) FROM sms_queue WHERE status IN (2,3) AND created_at > :startOfDay")
    suspend fun getSentCountForToday(startOfDay: Long): Int
}
