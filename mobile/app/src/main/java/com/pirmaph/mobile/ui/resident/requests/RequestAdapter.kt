package com.pirmaph.mobile.ui.resident.requests

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.pirmaph.mobile.R
import com.pirmaph.mobile.data.models.DocumentRequestResponse
import java.text.SimpleDateFormat
import java.util.Locale

class RequestAdapter(
    private var requests: List<DocumentRequestResponse>
) : RecyclerView.Adapter<RequestAdapter.RequestViewHolder>() {

    fun updateData(newRequests: List<DocumentRequestResponse>) {
        requests = newRequests
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RequestViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_resident_request, parent, false)
        return RequestViewHolder(view)
    }

    override fun onBindViewHolder(holder: RequestViewHolder, position: Int) {
        val request = requests[position]
        holder.bind(request)
    }

    override fun getItemCount(): Int = requests.size

    class RequestViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val statusAccent: View = itemView.findViewById(R.id.statusAccent)
        private val tvRequestId: TextView = itemView.findViewById(R.id.tvRequestId)
        private val tvDate: TextView = itemView.findViewById(R.id.tvDate)
        private val tvDocumentType: TextView = itemView.findViewById(R.id.tvDocumentType)
        private val tvPurpose: TextView = itemView.findViewById(R.id.tvPurpose)
        private val tvStatus: TextView = itemView.findViewById(R.id.tvStatus)

        fun bind(request: DocumentRequestResponse) {
            val shortId = request.id.take(8).uppercase()
            tvRequestId.text = "REQ-$shortId"

            tvDocumentType.text = formatDocumentType(request.documentType)
            tvPurpose.text = request.purpose

            try {
                // Assuming requestTimestamp is ISO 8601 string
                val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
                val date = parser.parse(request.requestTimestamp)
                if (date != null) {
                    val formatter = SimpleDateFormat("MMM dd, yyyy", Locale.US)
                    tvDate.text = formatter.format(date)
                } else {
                    tvDate.text = request.requestTimestamp.take(10)
                }
            } catch (e: Exception) {
                tvDate.text = request.requestTimestamp.take(10)
            }

            when (request.status) {
                "SUBMITTED", "UNDER_REVIEW", "PENDING_PAYMENT" -> {
                    tvStatus.text = if (request.status == "PENDING_PAYMENT") "Pending Payment" else "Pending"
                    tvStatus.setTextColor(Color.parseColor("#EAB308")) // Gold
                    tvStatus.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1AEAB308"))
                    statusAccent.setBackgroundColor(Color.parseColor("#EAB308"))
                }
                "APPROVED" -> {
                    tvStatus.text = "Approved"
                    tvStatus.setTextColor(Color.parseColor("#10B981")) // Green
                    tvStatus.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1A10B981"))
                    statusAccent.setBackgroundColor(Color.parseColor("#10B981"))
                }
                "READY_FOR_RELEASE" -> {
                    tvStatus.text = "For Release"
                    tvStatus.setTextColor(Color.parseColor("#3B82F6")) // Blue
                    tvStatus.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1A3B82F6"))
                    statusAccent.setBackgroundColor(Color.parseColor("#3B82F6"))
                }
                "DECLINED" -> {
                    tvStatus.text = "Rejected"
                    tvStatus.setTextColor(Color.parseColor("#EF4444")) // Red
                    tvStatus.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1AEF4444"))
                    statusAccent.setBackgroundColor(Color.parseColor("#EF4444"))
                }
                else -> {
                    tvStatus.text = request.status
                    tvStatus.setTextColor(Color.GRAY)
                    tvStatus.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1AAAAAAA"))
                    statusAccent.setBackgroundColor(Color.GRAY)
                }
            }
        }

        private fun formatDocumentType(type: String): String {
            return type.replace("_", " ").split(" ").joinToString(" ") { it.lowercase().capitalize() }
        }
    }
}
