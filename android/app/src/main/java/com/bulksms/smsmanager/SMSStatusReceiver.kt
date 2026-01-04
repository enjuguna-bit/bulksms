package com.bulksms.smsmanager

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.SmsManager
import android.app.Activity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class SMSStatusReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val dbId = intent.getLongExtra(BroadcastConstants.EXTRA_DB_ID, -1)
        if (dbId == -1L) return

        val dao = AppDatabase.getDatabase(context).smsDao()
        
        CoroutineScope(Dispatchers.IO).launch {
            when (intent.action) {
                BroadcastConstants.SMS_SENT_ACTION -> {
                    if (resultCode == Activity.RESULT_OK) {
                        dao.updateStatus(dbId, 2) // SENT
                    } else {
                        val error = when (resultCode) {
                            SmsManager.RESULT_ERROR_GENERIC_FAILURE -> "Generic failure"
                            SmsManager.RESULT_ERROR_NO_SERVICE -> "No service"
                            SmsManager.RESULT_ERROR_NULL_PDU -> "Null PDU"
                            SmsManager.RESULT_ERROR_RADIO_OFF -> "Radio off"
                            else -> "Unknown error"
                        }
                        dao.markAsFailed(dbId, error)
                    }
                }
                BroadcastConstants.SMS_DELIVERED_ACTION -> {
                    if (resultCode == Activity.RESULT_OK) {
                        dao.updateStatus(dbId, 3) // DELIVERED
                    }
                }
            }
        }
    }
}
