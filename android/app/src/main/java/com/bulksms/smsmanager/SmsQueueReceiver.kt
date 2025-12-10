package com.bulksms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.HeadlessJsTaskService

class SmsQueueReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val serviceIntent = Intent(context, SmsQueueService::class.java)
        context.startService(serviceIntent)
        HeadlessJsTaskService.acquireWakeLockNow(context)
    }
}
