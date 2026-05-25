package com.pirmaph.mobile.ui.resident.dashboard

import android.content.res.ColorStateList
import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.pirmaph.mobile.R
import com.pirmaph.mobile.data.models.DocumentRequestResponse
import java.text.SimpleDateFormat
import java.util.Locale

class RecentRequestsAdapter : RecyclerView.Adapter<RecentRequestsAdapter.ViewHolder>() {

    private val requests = mutableListOf<DocumentRequestResponse>()

    fun submitList(newRequests: List<DocumentRequestResponse>) {
        requests.clear()
        requests.addAll(newRequests)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_recent_request, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(requests[position])
    }

    override fun getItemCount(): Int = requests.size

    class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvDocumentType: TextView = itemView.findViewById(R.id.tvDocumentType)
        private val tvDocumentMeta: TextView = itemView.findViewById(R.id.tvDocumentMeta)
        private val tvStatusBadge: TextView = itemView.findViewById(R.id.tvStatusBadge)
        private val ivDocumentIcon: ImageView = itemView.findViewById(R.id.ivDocumentIcon)

        fun bind(request: DocumentRequestResponse) {
            tvDocumentType.text = request.documentType.replace("_", " ").split(" ").joinToString(" ") { it.capitalize() }
            
            // Format date if possible
            var dateStr = request.requestTimestamp
            try {
                val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                val formatter = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())
                val date = parser.parse(request.requestTimestamp)
                if (date != null) {
                    dateStr = formatter.format(date)
                }
            } catch (e: Exception) {
                // Ignore parsing errors and use the raw string
            }
            
            tvDocumentMeta.text = "Submitted $dateStr · ${request.purpose}"

            val (statusText, colorHex) = when (request.status) {
                "SUBMITTED", "UNDER_REVIEW", "PENDING_PAYMENT" -> Pair(request.status.replace("_", " ").capitalize(), "#F59E0B") // Gold
                "APPROVED", "READY_FOR_RELEASE" -> Pair(request.status.replace("_", " ").capitalize(), "#10B981") // Green
                "DECLINED" -> Pair("Rejected", "#EF4444") // Red
                else -> Pair(request.status, "#F59E0B")
            }

            tvStatusBadge.text = statusText
            tvStatusBadge.backgroundTintList = ColorStateList.valueOf(Color.parseColor(colorHex))
            
            // Basic icon mapping based on type
            val iconRes = when {
                request.documentType.contains("CLEARANCE") -> R.drawable.ic_assignment
                request.documentType.contains("ID") -> R.drawable.ic_person
                request.documentType.contains("RESIDENCY") -> R.drawable.ic_home
                else -> R.drawable.ic_assignment
            }
            ivDocumentIcon.setImageResource(iconRes)
        }
    }
}
