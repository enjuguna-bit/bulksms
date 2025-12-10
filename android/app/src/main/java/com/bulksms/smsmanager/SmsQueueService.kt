package com.bulksms

import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import android.content.Intent

class SmsQueueService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        return HeadlessJsTaskConfig(
            "SmsQueueProcessor",
            null,
            30000, // 30 seconds timeout
            true
        )
    }
}
