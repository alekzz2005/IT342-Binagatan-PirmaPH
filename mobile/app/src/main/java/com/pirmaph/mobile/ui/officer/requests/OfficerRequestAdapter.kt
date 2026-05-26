package com.pirmaph.mobile.ui.officer.requests

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.pirmaph.mobile.R
import com.pirmaph.mobile.data.models.OfficerDocumentRequestResponse
import java.text.SimpleDateFormat
import java.util.Locale

class OfficerRequestAdapter(
    private var requests: List<OfficerDocumentRequestResponse>,
    private val onItemClick: (OfficerDocumentRequestResponse) -> Unit
) : RecyclerView.Adapter<OfficerRequestAdapter.ViewHolder>() {

    fun updateData(newList: List<OfficerDocumentRequestResponse>) {
        requests = newList
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_officer_request, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) =
        holder.bind(requests[position], onItemClick)

    override fun getItemCount() = requests.size

    class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val accent: View = itemView.findViewById(R.id.officerStatusAccent)
        private val tvId: TextView = itemView.findViewById(R.id.tvOfficerRequestId)
        private val tvDate: TextView = itemView.findViewById(R.id.tvOfficerDate)
        private val tvName: TextView = itemView.findViewById(R.id.tvOfficerResidentName)
        private val tvDoc: TextView = itemView.findViewById(R.id.tvOfficerDocumentType)
        private val tvStatus: TextView = itemView.findViewById(R.id.tvOfficerStatus)

        fun bind(request: OfficerDocumentRequestResponse, onClick: (OfficerDocumentRequestResponse) -> Unit) {
            tvId.text = "REQ-${request.id.take(8).uppercase()}"
            tvName.text = request.residentFullName ?: "Resident ${request.id.take(8)}"
            tvDoc.text = formatDocType(request.documentType)

            // Format date
            tvDate.text = try {
                val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
                val date = parser.parse(request.requestTimestamp ?: "")
                if (date != null) SimpleDateFormat("MMM dd, yyyy", Locale.US).format(date)
                else request.requestTimestamp?.take(10) ?: "—"
            } catch (e: Exception) {
                request.requestTimestamp?.take(10) ?: "—"
            }

            applyStatusStyle(request.status)
            itemView.setOnClickListener { onClick(request) }
        }

        private fun applyStatusStyle(status: String?) {
            when (status) {
                "SUBMITTED", "UNDER_REVIEW" -> {
                    tvStatus.text = "Pending"
                    tvStatus.setTextColor(Color.parseColor("#A07800"))
                    tvStatus.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1AFCD116"))
                    accent.setBackgroundColor(Color.parseColor("#FCD116"))
                }
                "PENDING_PAYMENT" -> {
                    tvStatus.text = "Pending Payment"
                    tvStatus.setTextColor(Color.parseColor("#7C3AED"))
                    tvStatus.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1A8B5CF6"))
                    accent.setBackgroundColor(Color.parseColor("#8B5CF6"))
                }
                "APPROVED" -> {
                    tvStatus.text = "Approved"
                    tvStatus.setTextColor(Color.parseColor("#059669"))
                    tvStatus.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1A10B981"))
                    accent.setBackgroundColor(Color.parseColor("#10B981"))
                }
                "READY_FOR_RELEASE" -> {
                    tvStatus.text = "For Release"
                    tvStatus.setTextColor(Color.parseColor("#7C3AED"))
                    tvStatus.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1A8B5CF6"))
                    accent.setBackgroundColor(Color.parseColor("#8B5CF6"))
                }
                "DECLINED" -> {
                    tvStatus.text = "Rejected"
                    tvStatus.setTextColor(Color.parseColor("#CE1126"))
                    tvStatus.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1ACE1126"))
                    accent.setBackgroundColor(Color.parseColor("#CE1126"))
                }
                else -> {
                    tvStatus.text = status ?: "Unknown"
                    tvStatus.setTextColor(Color.GRAY)
                    tvStatus.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1AAAAAAA"))
                    accent.setBackgroundColor(Color.GRAY)
                }
            }
        }

        private fun formatDocType(type: String?): String {
            if (type.isNullOrBlank()) return "Unknown Document"
            return type.replace("_", " ").split(" ")
                .joinToString(" ") { it.lowercase().replaceFirstChar { c -> c.uppercase() } }
        }
    }
}
