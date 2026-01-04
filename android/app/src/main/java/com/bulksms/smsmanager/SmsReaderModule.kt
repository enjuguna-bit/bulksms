package com.bulksms.smsmanager

import android.Manifest
import android.content.pm.PackageManager
import android.database.Cursor
import android.net.Uri
import android.provider.Telephony
import android.util.Log
import androidx.core.content.ContextCompat
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
  // 🔐 Permission Check - Checks SMS read permission and default handler status
  // ------------------------------------------------------------
  @ReactMethod
  fun checkPermissions(promise: Promise) {
    try {
      val context = reactApplicationContext
      
      val hasReadSmsPermission = ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.READ_SMS
      ) == PackageManager.PERMISSION_GRANTED

      val hasReceiveSmsPermission = ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.RECEIVE_SMS
      ) == PackageManager.PERMISSION_GRANTED
      
      val defaultSmsPackage = Telephony.Sms.getDefaultSmsPackage(context)
      val isDefaultSmsHandler = defaultSmsPackage == context.packageName
      
      val result = Arguments.createMap().apply {
        putBoolean("readSms", hasReadSmsPermission)
        putBoolean("receiveSms", hasReceiveSmsPermission)
        putBoolean("isDefaultHandler", isDefaultSmsHandler)
        putString("defaultPackage", defaultSmsPackage ?: "")
      }
      
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("PERMISSION_CHECK_ERROR", e.message, e)
    }
  }

  // ------------------------------------------------------------
  // 📜 Read all messages sorted by date (descending) with pagination
  // ------------------------------------------------------------
  @ReactMethod
  fun getAll(limit: Int, promise: Promise) {
    queryMessages(null, limit, 0, promise, parseMpesa = false)
  }

  @ReactMethod
  fun getAllPaginated(limit: Int, offset: Int, promise: Promise) {
    queryMessages(null, limit, offset, promise, parseMpesa = false)
  }

  // ------------------------------------------------------------
  // 📬 Read messages for a specific address with pagination
  // ------------------------------------------------------------
  @ReactMethod
  fun getThreadByAddress(address: String, limit: Int, promise: Promise) {
    if (address.isBlank()) {
      promise.reject("INVALID_ARGS", "address is required")
      return
    }
    queryMessages("${Telephony.Sms.ADDRESS} = ?", limit, 0, promise, arrayOf(address), false)
  }

  @ReactMethod
  fun getThreadByAddressPaginated(address: String, limit: Int, offset: Int, promise: Promise) {
    if (address.isBlank()) {
      promise.reject("INVALID_ARGS", "address is required")
      return
    }
    queryMessages("${Telephony.Sms.ADDRESS} = ?", limit, offset, promise, arrayOf(address), false)
  }

  // ------------------------------------------------------------
  // 💰 Read M-PESA messages only with pagination
  // ------------------------------------------------------------
  @ReactMethod
  fun getMpesaMessages(limit: Int, promise: Promise) {
    queryMessages(null, limit, 0, promise, parseMpesa = true)
  }

  @ReactMethod
  fun getMpesaMessagesPaginated(limit: Int, offset: Int, promise: Promise) {
    queryMessages(null, limit, offset, promise, parseMpesa = true)
  }

  // ------------------------------------------------------------
  // 🧠 Core query logic with database-level pagination
  // ------------------------------------------------------------
  private fun queryMessages(
    selection: String?,
    limit: Int,
    offset: Int,
    promise: Promise,
    selectionArgs: Array<String>? = null,
    parseMpesa: Boolean
  ) {
    try {
      val uri: Uri = Telephony.Sms.CONTENT_URI
      
      // ⚡ FIX: Apply LIMIT/OFFSET at database level via sortOrder
      // This prevents loading entire SMS database into memory
      val effectiveLimit = if (limit <= 0) DEFAULT_PAGE_SIZE else limit.coerceAtMost(MAX_PAGE_SIZE)
      val sortOrderWithPagination = "${Telephony.Sms.DATE} DESC LIMIT $effectiveLimit OFFSET $offset"
      
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
        sortOrderWithPagination
      )

      val messages = Arguments.createArray()
      cursor?.use {
        val idIndex = it.getColumnIndex(Telephony.Sms._ID)
        val addressIndex = it.getColumnIndex(Telephony.Sms.ADDRESS)
        val bodyIndex = it.getColumnIndex(Telephony.Sms.BODY)
        val dateIndex = it.getColumnIndex(Telephony.Sms.DATE)
        val typeIndex = it.getColumnIndex(Telephony.Sms.TYPE)

        while (it.moveToNext()) {
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
  // 📥 Import existing messages for sync (with pagination)
  // ⚡ FIX: Now requires limit/offset to prevent OOM on large databases
  // ------------------------------------------------------------
  @ReactMethod
  fun importExistingMessages(promise: Promise) {
    // Default: import first page only for backward compatibility
    importExistingMessagesPaginated(DEFAULT_PAGE_SIZE, 0, promise)
  }

  @ReactMethod
  fun importExistingMessagesPaginated(limit: Int, offset: Int, promise: Promise) {
    try {
      val uri: Uri = Telephony.Sms.CONTENT_URI
      
      // ⚡ FIX: Apply pagination at database level
      val effectiveLimit = limit.coerceIn(1, MAX_PAGE_SIZE)
      val sortOrderWithPagination = "${Telephony.Sms.DATE} DESC LIMIT $effectiveLimit OFFSET $offset"
      
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
        sortOrderWithPagination
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
      
      // Return result with pagination metadata
      val result = Arguments.createMap()
      result.putArray("messages", messages)
      result.putInt("limit", effectiveLimit)
      result.putInt("offset", offset)
      result.putInt("count", messages.size())
      result.putBoolean("hasMore", messages.size() == effectiveLimit)
      
      promise.resolve(result)
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
    private const val DEFAULT_PAGE_SIZE = 500
    private const val MAX_PAGE_SIZE = 10000
  }
}
