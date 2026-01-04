package com.bulksms.smsmanager

import android.content.Context
import android.net.Uri
import android.provider.Telephony
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*

data class SmsMessageModel(
    val id: String,
    val address: String,
    val body: String,
    val date: Long,
    val type: Int // 1 = Received, 2 = Sent
)

class SmsRepository(private val context: Context) {

    // Fetch the 50 most recent messages for the Inbox List
    suspend fun getAllMessages(): List<SmsMessageModel> = withContext(Dispatchers.IO) {
        val messages = mutableListOf<SmsMessageModel>()
        
        val projection = arrayOf(
            Telephony.Sms._ID,
            Telephony.Sms.ADDRESS,
            Telephony.Sms.BODY,
            Telephony.Sms.DATE,
            Telephony.Sms.TYPE
        )

        // Query the System SMS Provider
        val cursor = context.contentResolver.query(
            Telephony.Sms.CONTENT_URI,
            projection,
            null, 
            null, 
            "${Telephony.Sms.DATE} DESC LIMIT 50" // Sort new to old
        )

        cursor?.use {
            val idIdx = it.getColumnIndex(Telephony.Sms._ID)
            val addrIdx = it.getColumnIndex(Telephony.Sms.ADDRESS)
            val bodyIdx = it.getColumnIndex(Telephony.Sms.BODY)
            val dateIdx = it.getColumnIndex(Telephony.Sms.DATE)
            val typeIdx = it.getColumnIndex(Telephony.Sms.TYPE)

            while (it.moveToNext()) {
                messages.add(
                    SmsMessageModel(
                        id = it.getString(idIdx),
                        address = it.getString(addrIdx),
                        body = it.getString(bodyIdx),
                        date = it.getLong(dateIdx),
                        type = it.getInt(typeIdx)
                    )
                )
            }
        }
        return@withContext messages
    }
}
