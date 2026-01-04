package com.bulksms.smsmanager

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.widget.Toast

object SingleSendManager {

    fun sendImmediateMessage(context: Context, phone: String, message: String, simSlot: Int = 0) {
        try {
            // Use our helper to pick Safaricom/Airtel
            val carrierName = if (simSlot == 0) "Safaricom" else "Airtel"
            val smsManager = SimUtils.getSmsManagerForCarrier(context, carrierName)

            // Track Sent Status
            val sentPI = PendingIntent.getBroadcast(
                context, 
                0, 
                Intent("SMS_SENT_SINGLE"), 
                PendingIntent.FLAG_IMMUTABLE
            )

            if (smsManager != null) {
                smsManager.sendTextMessage(phone, null, message, sentPI, null)
                Toast.makeText(context, "Sending...", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(context, "SIM not found!", Toast.LENGTH_SHORT).show()
            }

        } catch (e: Exception) {
            e.printStackTrace()
            Toast.makeText(context, "Failed: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }
}
