package com.pirmaph.mobile.ui.officer.dashboard

import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.pirmaph.mobile.R
import com.pirmaph.mobile.data.api.RetrofitClient
import com.pirmaph.mobile.data.local.TokenManager
import com.pirmaph.mobile.data.models.OfficerDocumentRequestResponse
import com.pirmaph.mobile.ui.officer.requests.OfficerRequestDetailBottomSheet
import kotlinx.coroutines.launch

class OfficerDashboardFragment : Fragment() {

    companion object {
        const val TAG = "OfficerDashboardFragment"

        private val ALL_STATUSES = listOf(
            "SUBMITTED", "UNDER_REVIEW", "APPROVED", "DECLINED",
            "READY_FOR_RELEASE", "PENDING_PAYMENT"
        )
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View = inflater.inflate(R.layout.fragment_officer_dashboard, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        ViewCompat.setOnApplyWindowInsetsListener(view.findViewById(R.id.officerDashboardHeader)) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(v.paddingLeft, bars.top + 44, v.paddingRight, v.paddingBottom)
            insets
        }

        loadDashboard(view)
    }

    private fun loadDashboard(view: View) {
        val pb = view.findViewById<ProgressBar>(R.id.pbDashboardLoading)
        val tvError = view.findViewById<TextView>(R.id.tvDashboardError)

        pb.visibility = View.VISIBLE
        tvError.visibility = View.GONE

        val api = RetrofitClient.create(TokenManager(requireContext()))

        lifecycleScope.launch {
            try {
                val results = ALL_STATUSES.map { status ->
                    try { api.getOfficerQueue(status) } catch (e: Exception) { emptyList() }
                }.flatten()

                val allRequests = results.distinctBy { it.id }
                    .sortedByDescending { it.requestTimestamp }

                bindStats(view, allRequests)
                bindRecentActivity(view, allRequests.take(5))
                tvError.visibility = View.GONE
            } catch (e: Exception) {
                tvError.text = "Failed to load dashboard: ${e.message}"
                tvError.visibility = View.VISIBLE
                Toast.makeText(requireContext(), e.message, Toast.LENGTH_SHORT).show()
            } finally {
                pb.visibility = View.GONE
            }
        }
    }

    private fun bindStats(view: View, requests: List<OfficerDocumentRequestResponse>) {
        view.findViewById<TextView>(R.id.tvTotalCount).text = requests.size.toString()
        view.findViewById<TextView>(R.id.tvPendingCount).text =
            requests.count { it.status == "SUBMITTED" || it.status == "UNDER_REVIEW" }.toString()
        view.findViewById<TextView>(R.id.tvApprovedCount).text =
            requests.count { it.status == "APPROVED" }.toString()
        view.findViewById<TextView>(R.id.tvForReleaseCount).text =
            requests.count { it.status == "READY_FOR_RELEASE" }.toString()
        view.findViewById<TextView>(R.id.tvRejectedCount).text =
            requests.count { it.status == "DECLINED" }.toString()
        view.findViewById<TextView>(R.id.tvPendingPaymentCount).text =
            requests.count { it.status == "PENDING_PAYMENT" }.toString()
    }

    private fun bindRecentActivity(view: View, recent: List<OfficerDocumentRequestResponse>) {
        val container = view.findViewById<LinearLayout>(R.id.llRecentActivity)
        val tvEmpty = view.findViewById<TextView>(R.id.tvNoRecentActivity)

        if (recent.isEmpty()) {
            tvEmpty.visibility = View.VISIBLE
            return
        }

        tvEmpty.visibility = View.GONE
        recent.forEach { request ->
            val itemView = LayoutInflater.from(requireContext())
                .inflate(R.layout.item_officer_request, container, false)

            // Bind data into item view
            val tvId = itemView.findViewById<TextView>(R.id.tvOfficerRequestId)
            val tvName = itemView.findViewById<TextView>(R.id.tvOfficerResidentName)
            val tvDoc = itemView.findViewById<TextView>(R.id.tvOfficerDocumentType)
            val tvDate = itemView.findViewById<TextView>(R.id.tvOfficerDate)
            val tvStatus = itemView.findViewById<TextView>(R.id.tvOfficerStatus)
            val accent = itemView.findViewById<View>(R.id.officerStatusAccent)

            tvId.text = "REQ-${request.id.take(8).uppercase()}"
            tvName.text = request.residentFullName ?: "Resident ${request.id.take(8)}"
            tvDoc.text = formatDocType(request.documentType)
            tvDate.text = request.requestTimestamp?.take(10) ?: "—"

            applyStatusStyle(tvStatus, accent, request.status)

            itemView.setOnClickListener {
                val sheet = OfficerRequestDetailBottomSheet.newInstance(request.id) {
                    view.let { v -> loadDashboard(v) }
                }
                sheet.show(parentFragmentManager, "OfficerRequestDetail")
            }

            // Add a divider between items (not after last)
            if (recent.indexOf(request) > 0) {
                val divider = View(requireContext())
                val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 1)
                lp.marginStart = 16
                lp.marginEnd = 16
                divider.layoutParams = lp
                divider.setBackgroundColor(Color.parseColor("#DCE4F5"))
                container.addView(divider)
            }

            container.addView(itemView)
        }
    }

    private fun applyStatusStyle(tv: TextView, accent: View, status: String?) {
        when (status) {
            "SUBMITTED", "UNDER_REVIEW" -> {
                tv.text = "Pending"
                tv.setTextColor(Color.parseColor("#A07800"))
                tv.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1AFCD116"))
                accent.setBackgroundColor(Color.parseColor("#FCD116"))
            }
            "PENDING_PAYMENT" -> {
                tv.text = "Pending Payment"
                tv.setTextColor(Color.parseColor("#7C3AED"))
                tv.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1A8B5CF6"))
                accent.setBackgroundColor(Color.parseColor("#8B5CF6"))
            }
            "APPROVED" -> {
                tv.text = "Approved"
                tv.setTextColor(Color.parseColor("#059669"))
                tv.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1A10B981"))
                accent.setBackgroundColor(Color.parseColor("#10B981"))
            }
            "READY_FOR_RELEASE" -> {
                tv.text = "For Release"
                tv.setTextColor(Color.parseColor("#7C3AED"))
                tv.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1A8B5CF6"))
                accent.setBackgroundColor(Color.parseColor("#8B5CF6"))
            }
            "DECLINED" -> {
                tv.text = "Rejected"
                tv.setTextColor(Color.parseColor("#CE1126"))
                tv.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1ACE1126"))
                accent.setBackgroundColor(Color.parseColor("#CE1126"))
            }
            else -> {
                tv.text = status ?: "Unknown"
                tv.setTextColor(Color.GRAY)
                tv.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1AAAAAAA"))
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
