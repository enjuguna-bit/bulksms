package com.bulksms.smsmanager

import android.content.Context
import android.content.Intent
import com.google.gson.Gson
import fi.iki.elonen.NanoHTTPD
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

data class ApiRequest(val phone: String, val message: String, val sim_slot: Int)

class LocalSmsServer(private val context: Context) : NanoHTTPD(8080) {

    override fun serve(session: IHTTPSession): Response {
        if (session.method == Method.POST && session.uri == "/send") {
            try {
                val map = HashMap<String, String>()
                session.parseBody(map)
                val json = map["postData"] ?: return newFixedLengthResponse(
                    Response.Status.BAD_REQUEST, 
                    MIME_PLAINTEXT, 
                    "Missing Body"
                )

                val request = Gson().fromJson(json, ApiRequest::class.java)
                
                val intent = Intent(context, SMSRelayService::class.java)
                intent.action = "ENQUEUE_MSG"
                intent.putExtra("phone", request.phone)
                intent.putExtra("msg", request.message)
                intent.putExtra("sim", if (request.sim_slot == 0) "Safaricom" else "Airtel")
                context.startService(intent)

                return newFixedLengthResponse(
                    Response.Status.OK, 
                    "application/json", 
                    "{\"status\": \"queued\"}"
                )
            } catch (e: Exception) {
                return newFixedLengthResponse(
                    Response.Status.INTERNAL_ERROR, 
                    MIME_PLAINTEXT, 
                    "Error: ${e.message}"
                )
            }
        }
        return newFixedLengthResponse(
            Response.Status.NOT_FOUND, 
            MIME_PLAINTEXT, 
            "Endpoint not found"
        )
    }
}
