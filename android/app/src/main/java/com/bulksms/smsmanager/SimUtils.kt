package com.bulksms.smsmanager

import android.content.Context
import android.telephony.SubscriptionManager
import android.telephony.SmsManager
import android.os.Build

object SimUtils {

    fun getSmsManagerForCarrier(context: Context, carrierName: String): SmsManager? {
        val subscriptionManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as SubscriptionManager
        
        // Requires READ_PHONE_STATE permission
        val activeSubs = subscriptionManager.activeSubscriptionInfoList ?: return null

        for (subInfo in activeSubs) {
            // Check Carrier Name (e.g., "Safaricom", "Airtel")
            val name = subInfo.carrierName.toString()
            if (name.contains(carrierName, ignoreCase = true)) {
                val subId = subInfo.subscriptionId
                
                return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    context.getSystemService(SmsManager::class.java).createForSubscriptionId(subId)
                } else {
                    SmsManager.getSmsManagerForSubscriptionId(subId)
                }
            }
        }
        // Fallback to default if carrier not found
        return SmsManager.getDefault()
    }
}
