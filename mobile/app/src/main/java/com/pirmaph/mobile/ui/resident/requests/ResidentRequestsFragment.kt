package com.pirmaph.mobile.ui.resident.requests

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ProgressBar
import android.widget.TextView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.RecyclerView
import com.pirmaph.mobile.R
import com.pirmaph.mobile.data.api.RetrofitClient
import com.pirmaph.mobile.data.local.TokenManager
import com.pirmaph.mobile.data.models.DocumentRequestResponse
import kotlinx.coroutines.launch

class ResidentRequestsFragment : Fragment() {

    companion object {
        const val TAG = "ResidentRequestsFragment"
    }

    private lateinit var adapter: RequestAdapter
    private var allRequests: List<DocumentRequestResponse> = emptyList()
    private var currentFilter: String = "ALL"

    private lateinit var rvRequests: RecyclerView
    private lateinit var progressBar: ProgressBar
    private lateinit var tvError: TextView
    private lateinit var tvEmptyState: TextView

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View = inflater.inflate(R.layout.fragment_resident_requests, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        ViewCompat.setOnApplyWindowInsetsListener(view.findViewById(R.id.headerLayout)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(v.paddingLeft, systemBars.top + 44, v.paddingRight, v.paddingBottom)
            insets
        }

        rvRequests = view.findViewById(R.id.rvRequests)
        progressBar = view.findViewById(R.id.progressBar)
        tvError = view.findViewById(R.id.tvError)
        tvEmptyState = view.findViewById(R.id.tvEmptyState)

        adapter = RequestAdapter(emptyList())
        rvRequests.adapter = adapter

        setupFilters(view)
        fetchRequests()
    }

    private fun setupFilters(view: View) {
        val chipAll = view.findViewById<TextView>(R.id.chipAll)
        val chipPending = view.findViewById<TextView>(R.id.chipPending)
        val chipApproved = view.findViewById<TextView>(R.id.chipApproved)
        val chipForRelease = view.findViewById<TextView>(R.id.chipForRelease)
        val chipRejected = view.findViewById<TextView>(R.id.chipRejected)

        val chips = listOf(chipAll, chipPending, chipApproved, chipForRelease, chipRejected)

        val setFilter = { filter: String, activeChip: TextView ->
            currentFilter = filter
            chips.forEach {
                it.setBackgroundResource(R.drawable.bg_input_field)
                it.setTextColor(resources.getColor(R.color.pirma_text_muted, null))
            }
            activeChip.setBackgroundResource(R.drawable.bg_btn_primary)
            activeChip.setTextColor(resources.getColor(R.color.white, null))
            applyFilter()
        }

        chipAll.setOnClickListener { setFilter("ALL", chipAll) }
        chipPending.setOnClickListener { setFilter("PENDING", chipPending) }
        chipApproved.setOnClickListener { setFilter("APPROVED", chipApproved) }
        chipForRelease.setOnClickListener { setFilter("RELEASE", chipForRelease) }
        chipRejected.setOnClickListener { setFilter("REJECTED", chipRejected) }
    }

    private fun applyFilter() {
        val filtered = when (currentFilter) {
            "PENDING" -> allRequests.filter { it.status in listOf("SUBMITTED", "UNDER_REVIEW", "PENDING_PAYMENT") }
            "APPROVED" -> allRequests.filter { it.status == "APPROVED" }
            "RELEASE" -> allRequests.filter { it.status == "READY_FOR_RELEASE" }
            "REJECTED" -> allRequests.filter { it.status == "DECLINED" }
            else -> allRequests
        }
        adapter.updateData(filtered)
        tvEmptyState.visibility = if (filtered.isEmpty()) View.VISIBLE else View.GONE
    }

    private fun fetchRequests() {
        progressBar.visibility = View.VISIBLE
        tvError.visibility = View.GONE
        rvRequests.visibility = View.GONE
        tvEmptyState.visibility = View.GONE

        val tokenManager = TokenManager(requireContext())
        val apiService = RetrofitClient.create(tokenManager)

        lifecycleScope.launch {
            try {
                val response = apiService.getMyRequests()
                allRequests = response.sortedByDescending { it.requestTimestamp }
                applyFilter()
                rvRequests.visibility = View.VISIBLE
            } catch (e: Exception) {
                tvError.text = "Failed to load requests: ${e.message}"
                tvError.visibility = View.VISIBLE
            } finally {
                progressBar.visibility = View.GONE
            }
        }
    }
}
