package com.bulksms.smsmanager

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.ColumnInfo

@Entity(tableName = "sms_queue")
data class SmsEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "phone_number") val phoneNumber: String,
    @ColumnInfo(name = "message_body") val messageBody: String,
    
    // Target SIM: 0 = Safaricom (usually), 1 = Airtel
    @ColumnInfo(name = "sim_slot") val simSlot: Int = 0, 
    
    // Status: 0=Pending, 1=Sending, 2=Sent, 3=Delivered, 4=Failed
    @ColumnInfo(name = "status") val status: Int = 0,
    
    @ColumnInfo(name = "created_at") val createdAt: Long = System.currentTimeMillis(),
    @ColumnInfo(name = "updated_at") val updatedAt: Long = System.currentTimeMillis(),
    
    // Critical for debugging: Why did it fail?
    @ColumnInfo(name = "error_message") val errorMessage: String? = null
)
