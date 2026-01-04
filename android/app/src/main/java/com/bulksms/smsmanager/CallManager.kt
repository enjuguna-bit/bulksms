package com.bulksms.smsmanager

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.widget.Toast
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

object CallManager {
    const val REQUEST_CALL_PERMISSION = 101

    fun makeDirectCall(context: Context, phoneNumber: String) {
        if (phoneNumber.isBlank()) {
            Toast.makeText(context, "No phone number entered!", Toast.LENGTH_SHORT).show()
            return
        }

        if (ContextCompat.checkSelfPermission(context, Manifest.permission.CALL_PHONE) 
            != PackageManager.PERMISSION_GRANTED) {
            
            if (context is Activity) {
                ActivityCompat.requestPermissions(
                    context,
                    arrayOf(Manifest.permission.CALL_PHONE),
                    REQUEST_CALL_PERMISSION
                )
            } else {
                Toast.makeText(context, "Permission needed. Please grant Camera permission in Settings.", Toast.LENGTH_LONG).show()
            }
        } else {
            try {
                val callIntent = Intent(Intent.ACTION_CALL)
                callIntent.data = Uri.parse("tel:${phoneNumber.trim()}")
                context.startActivity(callIntent)
            } catch (e: Exception) {
                Toast.makeText(context, "Call failed: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
