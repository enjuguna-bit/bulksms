package com.bulksms.smsmanager

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import java.text.SimpleDateFormat
import java.util.*

class SmsAdapter(
    private var messages: List<SmsMessageModel>,
    private val onContactClick: (String) -> Unit
) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {

    private val TYPE_RECEIVED = 1
    private val TYPE_SENT = 2
    private val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())

    override fun getItemViewType(position: Int): Int {
        return if (messages[position].type == 1) TYPE_RECEIVED else TYPE_SENT
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        return if (viewType == TYPE_SENT) {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_sms_sent, parent, false)
            SentViewHolder(view)
        } else {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_sms_received, parent, false)
            ReceivedViewHolder(view)
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        val msg = messages[position]
        
        when (holder) {
            is SentViewHolder -> holder.bind(msg)
            is ReceivedViewHolder -> holder.bind(msg)
        }
    }

    override fun getItemCount(): Int = messages.size

    fun updateList(newMessages: List<SmsMessageModel>) {
        messages = newMessages
        notifyDataSetChanged()
    }

    inner class SentViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val txtBody: TextView = itemView.findViewById(R.id.txtMessageBody)
        private val txtTime: TextView = itemView.findViewById(R.id.txtTime)

        fun bind(msg: SmsMessageModel) {
            txtBody.text = msg.body
            txtTime.text = timeFormat.format(Date(msg.date))
        }
    }

    inner class ReceivedViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val txtBody: TextView = itemView.findViewById(R.id.txtMessageBody)
        private val txtTime: TextView = itemView.findViewById(R.id.txtTime)
        private val txtSender: TextView = itemView.findViewById(R.id.txtSender)

        fun bind(msg: SmsMessageModel) {
            txtBody.text = msg.body
            txtTime.text = timeFormat.format(Date(msg.date))
            txtSender.text = msg.address
            
            txtSender.setOnClickListener {
                onContactClick(msg.address)
            }
            txtSender.paintFlags = txtSender.paintFlags or android.graphics.Paint.UNDERLINE_TEXT_FLAG
        }
    }
}
