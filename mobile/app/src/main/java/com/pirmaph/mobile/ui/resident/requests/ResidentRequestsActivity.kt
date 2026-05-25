package com.pirmaph.mobile.ui.resident.requests

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.RecyclerView
import com.pirmaph.mobile.R
import com.pirmaph.mobile.data.api.RetrofitClient
import com.pirmaph.mobile.data.local.TokenManager
import com.pirmaph.mobile.data.models.DocumentRequestResponse
import com.pirmaph.mobile.ui.resident.dashboard.ResidentDashboardActivity
import com.pirmaph.mobile.ui.resident.dashboard.ResidentNotificationsActivity
import kotlinx.coroutines.launch

import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class ResidentRequestsActivity : AppCompatActivity() {

    private lateinit var rvRequests: RecyclerView
    private lateinit var progressBar: ProgressBar
    private lateinit var tvError: TextView
    private lateinit var tvEmptyState: TextView
    private lateinit var adapter: RequestAdapter
    private var allRequests: List<DocumentRequestResponse> = emptyList()
    private var currentFilter: String = "ALL"

    companion object {
        fun start(context: Context) {
            val intent = Intent(context, ResidentRequestsActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            context.startActivity(intent)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_resident_requests)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.headerLayout)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(v.paddingLeft, systemBars.top + 44, v.paddingRight, v.paddingBottom)
            insets
        }

        rvRequests = findViewById(R.id.rvRequests)
        progressBar = findViewById(R.id.progressBar)
        tvError = findViewById(R.id.tvError)
        tvEmptyState = findViewById(R.id.tvEmptyState)

        adapter = RequestAdapter(emptyList())
        rvRequests.adapter = adapter

        setupBottomNavigation()
        setupFilters()
        fetchRequests()
    }

    private fun setupFilters() {
        val chipAll = findViewById<TextView>(R.id.chipAll)
        val chipPending = findViewById<TextView>(R.id.chipPending)
        val chipApproved = findViewById<TextView>(R.id.chipApproved)
        val chipForRelease = findViewById<TextView>(R.id.chipForRelease)
        val chipRejected = findViewById<TextView>(R.id.chipRejected)

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

        val tokenManager = TokenManager(this)
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

    private fun setupBottomNavigation() {
        findViewById<View>(R.id.navHome).setOnClickListener {
            ResidentDashboardActivity.start(this)
            overridePendingTransition(0, 0)
        }
        findViewById<View>(R.id.navNotification).setOnClickListener {
            ResidentNotificationsActivity.start(this)
            overridePendingTransition(0, 0)
        }
        findViewById<View>(R.id.fabNewRequest).setOnClickListener {
            SubmitRequestActivity.start(this)
        }
    }

    override fun onPause() {
        super.onPause()
        overridePendingTransition(0, 0)
    }
}
