package com.bulksms.smsmanager

import android.database.Cursor
import android.net.Uri
import android.provider.Telephony
import android.util.Log
import com.facebook.react.bridge.*
import java.util.regex.Pattern

/**
 * ✅ SmsReaderModule
 * ------------------------------------------------------------
 * Reads SMS messages (Inbox & Sent) from the device using Telephony provider.
 * - No external dependencies
 * - Play Protect compliant
 * - Works when app is the default SMS handler
 * ------------------------------------------------------------
 */
class SmsReaderModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "SmsReaderModule"

  override fun canOverrideExistingModule(): Boolean = true

  // ------------------------------------------------------------
  // 📜 Read all messages sorted by date (descending)
  // ------------------------------------------------------------
  @ReactMethod
  fun getAll(limit: Int, promise: Promise) {
    queryMessages(null, limit, promise, parseMpesa = false)
  }

  // ------------------------------------------------------------
  // 📬 Read messages for a specific address
  // ------------------------------------------------------------
  @ReactMethod
  fun getThreadByAddress(address: String, limit: Int, promise: Promise) {
    if (address.isBlank()) {
      promise.reject("INVALID_ARGS", "address is required")
      return
    }
    queryMessages("${Telephony.Sms.ADDRESS} = ?", limit, promise, arrayOf(address), false)
  }

  // ------------------------------------------------------------
  // 💰 Read M-PESA messages only
  // ------------------------------------------------------------
  @ReactMethod
  fun getMpesaMessages(limit: Int, promise: Promise) {
    queryMessages(null, limit, promise, parseMpesa = true)
  }

  // ------------------------------------------------------------
  // 🧠 Core query logic
  // ------------------------------------------------------------
  private fun queryMessages(
    selection: String?,
    limit: Int,
    promise: Promise,
    selectionArgs: Array<String>? = null,
    parseMpesa: Boolean
  ) {
    try {
      val uri: Uri = Telephony.Sms.CONTENT_URI
      val cursor: Cursor? = reactApplicationContext.contentResolver.query(
        uri,
        arrayOf(
          Telephony.Sms._ID,
          Telephony.Sms.ADDRESS,
          Telephony.Sms.BODY,
          Telephony.Sms.DATE,
          Telephony.Sms.TYPE
        ),
        selection,
        selectionArgs,
        "${Telephony.Sms.DATE} DESC"
      )

      val messages = Arguments.createArray()
      cursor?.use {
        val idIndex = it.getColumnIndex(Telephony.Sms._ID)
        val addressIndex = it.getColumnIndex(Telephony.Sms.ADDRESS)
        val bodyIndex = it.getColumnIndex(Telephony.Sms.BODY)
        val dateIndex = it.getColumnIndex(Telephony.Sms.DATE)
        val typeIndex = it.getColumnIndex(Telephony.Sms.TYPE)

        var count = 0
        while (it.moveToNext() && (limit <= 0 || count < limit)) {
          val body = it.getString(bodyIndex) ?: ""
          if (parseMpesa && !isMpesaKeyword(body)) continue

          val map = Arguments.createMap()
          map.putString("id", it.getString(idIndex))
          map.putString("address", it.getString(addressIndex))
          map.putString("body", body)
          map.putDouble("timestamp", it.getLong(dateIndex).toDouble())

          val type = it.getInt(typeIndex)
          map.putString(
            "type",
            if (type == Telephony.Sms.MESSAGE_TYPE_INBOX) "incoming" else "outgoing"
          )

          if (parseMpesa) {
            parseMpesaMessage(body)?.let { p ->
              map.putString("transactionCode", p.transactionCode)
              map.putString("amount", p.amount)
              map.putString("payer", p.payer)
              map.putString("phoneNumber", p.phoneNumber)
              map.putString("reference", p.reference)
              map.putString("messageType", p.messageType)
            }
          }
          messages.pushMap(map)
          count++
        }
      }
      promise.resolve(messages)
    } catch (e: SecurityException) {
      promise.reject(
        "PERMISSION_DENIED",
        "READ_SMS permission missing or app not default SMS handler",
        e
      )
    } catch (e: Exception) {
      promise.reject("SMS_READ_ERROR", e.message, e)
    }
  }

  private fun isMpesaKeyword(body: String): Boolean {
    val lower = body.lowercase()
    return lower.contains("m-pesa") ||
           lower.contains("mpesa") ||
           lower.contains("confirmed") ||
           lower.contains("received from") ||
           lower.contains("sent to") ||
           lower.contains("paid to")
  }

  private fun parseMpesaMessage(body: String): MpesaMessage? {
    val txPattern = Pattern.compile("([A-Z0-9]{10})")
    val amountPattern = Pattern.compile("Ksh[\\d,]+(\\.\\d{2})?")
    val payerPattern = Pattern.compile("(?i)(?:from|to) ([A-Za-z\\s\\d]+)")
    val phonePattern = Pattern.compile("(?:^|\\s)(2547\\d{8})")
    val refPattern = Pattern.compile("(?i)Account (\\S+)")

    val txCode = txPattern.matcher(body).let { if (it.find()) it.group(1) else null }
    val amount = amountPattern.matcher(body).let { if (it.find()) it.group(0) else null }
    val payer = payerPattern.matcher(body).let { if (it.find()) it.group(1)?.trim() else null }
    val phone = phonePattern.matcher(body).let { if (it.find()) it.group(1)?.trim() else null }
    val reference = refPattern.matcher(body).let { if (it.find()) it.group(1) else null }

    if (txCode != null && amount != null) {
      val type = when {
        body.contains("received from", true) -> "INCOMING_PAYMENT"
        body.contains("sent to", true) -> "OUTGOING_PAYMENT"
        body.contains("paid to", true) -> "BUY_GOODS"
        else -> "OTHER"
      }
      return MpesaMessage(txCode, amount, payer ?: "", phone ?: "", reference ?: "", type)
    }
    return null
  }

  data class MpesaMessage(
    val transactionCode: String,
    val amount: String,
    val payer: String,
    val phoneNumber: String,
    val reference: String,
    val messageType: String
  )

  // ------------------------------------------------------------
  // 📊 Get count of all messages
  // ------------------------------------------------------------
  @ReactMethod
  fun getMessageCount(promise: Promise) {
    try {
      val uri: Uri = Telephony.Sms.CONTENT_URI
      val cursor: Cursor? = reactApplicationContext.contentResolver.query(
        uri,
        arrayOf("COUNT(*) as count"),
        null,
        null,
        null
      )

      cursor?.use {
        if (it.moveToFirst()) {
          val count = it.getInt(0)
          promise.resolve(count)
        } else {
          promise.resolve(0)
        }
      } ?: promise.resolve(0)
    } catch (e: SecurityException) {
      promise.reject(
        "PERMISSION_DENIED",
        "READ_SMS permission missing or app not default SMS handler",
        e
      )
    } catch (e: Exception) {
      promise.reject("SMS_COUNT_ERROR", e.message, e)
    }
  }

  // ------------------------------------------------------------
  // 📥 Import existing messages for sync
  // ------------------------------------------------------------
  @ReactMethod
  fun importExistingMessages(promise: Promise) {
    try {
      val uri: Uri = Telephony.Sms.CONTENT_URI
      val cursor: Cursor? = reactApplicationContext.contentResolver.query(
        uri,
        arrayOf(
          Telephony.Sms._ID,
          Telephony.Sms.ADDRESS,
          Telephony.Sms.BODY,
          Telephony.Sms.DATE,
          Telephony.Sms.TYPE,
          Telephony.Sms.STATUS
        ),
        null,
        null,
        "${Telephony.Sms.DATE} DESC"
      )

      val messages = Arguments.createArray()
      cursor?.use {
        val idIndex = it.getColumnIndex(Telephony.Sms._ID)
        val addressIndex = it.getColumnIndex(Telephony.Sms.ADDRESS)
        val bodyIndex = it.getColumnIndex(Telephony.Sms.BODY)
        val dateIndex = it.getColumnIndex(Telephony.Sms.DATE)
        val typeIndex = it.getColumnIndex(Telephony.Sms.TYPE)
        val statusIndex = it.getColumnIndex(Telephony.Sms.STATUS)

        while (it.moveToNext()) {
          val map = Arguments.createMap()
          map.putString("id", it.getString(idIndex))
          map.putString("address", it.getString(addressIndex))
          map.putString("body", it.getString(bodyIndex))
          map.putDouble("timestamp", it.getLong(dateIndex).toDouble())

          val type = it.getInt(typeIndex)
          map.putString(
            "type",
            if (type == Telephony.Sms.MESSAGE_TYPE_INBOX) "incoming" else "outgoing"
          )

          // Map status
          val status = it.getInt(statusIndex)
          map.putString(
            "status",
            when (status) {
              Telephony.Sms.STATUS_COMPLETE -> "sent"
              Telephony.Sms.STATUS_PENDING -> "pending"
              Telephony.Sms.STATUS_FAILED -> "failed"
              else -> "received"
            }
          )

          // Use address as threadId for now
          map.putString("threadId", it.getString(addressIndex))
          map.putNull("simSlot") // Not available in content provider

          messages.pushMap(map)
        }
      }
      promise.resolve(messages)
    } catch (e: SecurityException) {
      promise.reject(
        "PERMISSION_DENIED",
        "READ_SMS permission missing or app not default SMS handler",
        e
      )
    } catch (e: Exception) {
      promise.reject("SMS_IMPORT_ERROR", e.message, e)
    }
  }

  companion object {
    private const val TAG = "SmsReaderModule"
  }
}
