package com.bulksms.smsmanager

object BroadcastConstants {
    // Unified broadcast actions
    const val SMS_SENT_ACTION = "com.bulksms.smsmanager.SMS_SENT"
    const val SMS_DELIVERED_ACTION = "com.bulksms.smsmanager.SMS_DELIVERED"
    const val UPDATE_INBOX_ACTION = "com.bulksms.smsmanager.UPDATE_INBOX"
    
    // Intent extra keys
    const val EXTRA_DB_ID = "db_id"
    const val EXTRA_SENDER = "sender"
    const val EXTRA_BODY = "body"
}
