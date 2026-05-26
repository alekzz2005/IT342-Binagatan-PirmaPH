package com.pirmaph.mobile.ui.officer.requests

import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.pirmaph.mobile.R
import com.pirmaph.mobile.data.api.RetrofitClient
import com.pirmaph.mobile.data.cache.OfficerQueueCache
import com.pirmaph.mobile.data.local.TokenManager
import com.pirmaph.mobile.data.models.OfficerDocumentRequestResponse
import kotlinx.coroutines.launch

class OfficerRequestsFragment : Fragment() {

    companion object {
        const val TAG = "OfficerRequestsFragment"

        private val ALL_STATUSES = listOf(
            "SUBMITTED", "UNDER_REVIEW", "APPROVED", "DECLINED",
            "READY_FOR_RELEASE", "PENDING_PAYMENT"
        )
    }

    private lateinit var adapter: OfficerRequestAdapter
    private var allRequests: List<OfficerDocumentRequestResponse> = emptyList()
    private var activeFilter = "ALL"

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View = inflater.inflate(R.layout.fragment_officer_requests, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        ViewCompat.setOnApplyWindowInsetsListener(view.findViewById(R.id.officerQueueHeader)) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(v.paddingLeft, bars.top + 44, v.paddingRight, v.paddingBottom)
            insets
        }

        setupRecyclerView(view)
        setupFilterChips(view)
        loadQueue(view, forceRefresh = false)
    }

    private fun setupRecyclerView(view: View) {
        val rv = view.findViewById<RecyclerView>(R.id.rvOfficerQueue)
        adapter = OfficerRequestAdapter(emptyList()) { request ->
            openDetail(request.id)
        }
        rv.layoutManager = LinearLayoutManager(requireContext())
        rv.adapter = adapter
    }

    private fun setupFilterChips(view: View) {
        val chips = mapOf(
            view.findViewById<TextView>(R.id.chipAll) to "ALL",
            view.findViewById<TextView>(R.id.chipPending) to "PENDING",
            view.findViewById<TextView>(R.id.chipApproved) to "APPROVED",
            view.findViewById<TextView>(R.id.chipRejected) to "REJECTED",
            view.findViewById<TextView>(R.id.chipForRelease) to "FOR_RELEASE",
            view.findViewById<TextView>(R.id.chipPayment) to "PAYMENT"
        )

        chips.forEach { (chip, filter) ->
            chip.setOnClickListener {
                activeFilter = filter
                applyFilter(view)
                updateChipStyles(chips, chip)
            }
        }
    }

    private fun updateChipStyles(chips: Map<TextView, String>, activeChip: TextView) {
        chips.keys.forEach { chip ->
            if (chip == activeChip) {
                chip.setTextColor(Color.WHITE)
                chip.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#0038A8"))
            } else {
                when (chips[chip]) {
                    "PENDING" -> {
                        chip.setTextColor(Color.parseColor("#A07800"))
                        chip.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1AFCD116"))
                    }
                    "APPROVED" -> {
                        chip.setTextColor(Color.parseColor("#059669"))
                        chip.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1A10B981"))
                    }
                    "REJECTED" -> {
                        chip.setTextColor(Color.parseColor("#CE1126"))
                        chip.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1ACE1126"))
                    }
                    "FOR_RELEASE", "PAYMENT" -> {
                        chip.setTextColor(Color.parseColor("#7C3AED"))
                        chip.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1A8B5CF6"))
                    }
                    else -> {
                        chip.setTextColor(Color.parseColor("#6B7A99"))
                        chip.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1A6B7A99"))
                    }
                }
            }
        }
    }

    private fun applyFilter(view: View) {
        val filtered = when (activeFilter) {
            "PENDING" -> allRequests.filter { it.status == "SUBMITTED" || it.status == "UNDER_REVIEW" }
            "APPROVED" -> allRequests.filter { it.status == "APPROVED" }
            "REJECTED" -> allRequests.filter { it.status == "DECLINED" }
            "FOR_RELEASE" -> allRequests.filter { it.status == "READY_FOR_RELEASE" }
            "PAYMENT" -> allRequests.filter { it.status == "PENDING_PAYMENT" }
            else -> allRequests
        }
        adapter.updateData(filtered)

        val tvEmpty = view.findViewById<TextView>(R.id.tvQueueEmpty)
        tvEmpty.visibility = if (filtered.isEmpty()) View.VISIBLE else View.GONE
    }

    /**
     * Loads the queue with caching + optimistic UI.
     * - If valid cached data exists: show it instantly, then silently refresh in background.
     * - If cache is stale (or forceRefresh): show spinner, fetch fresh data.
     */
    fun loadQueue(view: View, forceRefresh: Boolean = false) {
        val pb = view.findViewById<ProgressBar>(R.id.pbQueueLoading)
        val tvError = view.findViewById<TextView>(R.id.tvQueueError)

        if (forceRefresh) OfficerQueueCache.invalidate()

        val cached = OfficerQueueCache.get()
        if (cached != null) {
            // Optimistic: show stale data immediately, refresh silently
            allRequests = cached
            applyFilter(view)
            tvError.visibility = View.GONE
            fetchQueue(view, pb = null, tvError = tvError)
        } else {
            pb.visibility = View.VISIBLE
            tvError.visibility = View.GONE
            fetchQueue(view, pb = pb, tvError = tvError)
        }
    }

    private fun fetchQueue(view: View, pb: ProgressBar?, tvError: TextView) {
        val tokenManager = TokenManager(requireContext())
        val api = RetrofitClient.create(tokenManager)

        lifecycleScope.launch {
            try {
                val results = ALL_STATUSES.map { status ->
                    try { api.getOfficerQueue(status) } catch (e: Exception) { emptyList() }
                }.flatten()

                val deduped = results.distinctBy { it.id }
                    .sortedByDescending { it.requestTimestamp }

                OfficerQueueCache.set(deduped)
                allRequests = deduped
                applyFilter(view)
                tvError.visibility = View.GONE
            } catch (e: Exception) {
                tvError.text = "Failed to load queue: ${e.message}"
                tvError.visibility = View.VISIBLE
                Toast.makeText(requireContext(), e.message, Toast.LENGTH_SHORT).show()
            } finally {
                pb?.visibility = View.GONE
            }
        }
    }

    private fun openDetail(requestId: String) {
        val sheet = OfficerRequestDetailBottomSheet.newInstance(requestId) {
            // Force refresh after action — cache is invalidated and data is re-fetched
            view?.let { loadQueue(it, forceRefresh = true) }
        }
        sheet.show(parentFragmentManager, "OfficerRequestDetail")
    }
}
