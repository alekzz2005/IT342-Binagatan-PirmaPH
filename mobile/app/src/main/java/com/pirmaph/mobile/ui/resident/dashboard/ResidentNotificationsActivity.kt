package com.pirmaph.mobile.ui.resident.dashboard

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.recyclerview.widget.RecyclerView
import com.pirmaph.mobile.R
import com.pirmaph.mobile.data.local.TokenManager

class ResidentNotificationsActivity : AppCompatActivity() {

    private lateinit var tokenManager: TokenManager
    
    private val viewModel: ResidentNotificationsViewModel by viewModels {
        ResidentNotificationsViewModelFactory(tokenManager)
    }

    private lateinit var announcementsAdapter: AnnouncementsAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_resident_notifications)

        tokenManager = TokenManager(this)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.headerLayout)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(v.paddingLeft, systemBars.top + 44, v.paddingRight, v.paddingBottom)
            insets
        }

        setupRecyclerView()
        setupListeners()
        setupObservers()
        viewModel.loadNotifications()
    }

    private fun setupRecyclerView() {
        announcementsAdapter = AnnouncementsAdapter()
        findViewById<RecyclerView>(R.id.rvAnnouncements).adapter = announcementsAdapter
    }

    private fun setupListeners() {
        findViewById<FrameLayout>(R.id.fabNewRequest).setOnClickListener {
            com.pirmaph.mobile.ui.resident.requests.SubmitRequestActivity.start(this)
        }

        findViewById<View>(R.id.navRequests)?.setOnClickListener {
            com.pirmaph.mobile.ui.resident.requests.ResidentRequestsActivity.start(this)
            overridePendingTransition(0, 0)
        }

        findViewById<LinearLayout>(R.id.navHome).setOnClickListener {
            com.pirmaph.mobile.ui.resident.dashboard.ResidentDashboardActivity.start(this)
            overridePendingTransition(0, 0)
        }
    }

    private fun setupObservers() {
        val progressBar = findViewById<ProgressBar>(R.id.progressBar)
        val tvError = findViewById<TextView>(R.id.tvError)

        viewModel.isLoading.observe(this) { isLoading ->
            progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
        }

        viewModel.error.observe(this) { errorMsg ->
            if (errorMsg.isNotEmpty()) {
                tvError.visibility = View.VISIBLE
                tvError.text = errorMsg
                Toast.makeText(this, errorMsg, Toast.LENGTH_LONG).show()
            } else {
                tvError.visibility = View.GONE
            }
        }

        viewModel.announcements.observe(this) { items ->
            announcementsAdapter.submitList(items)
            findViewById<TextView>(R.id.tvEmptyAnnouncements).visibility = if (items.isEmpty()) View.VISIBLE else View.GONE
        }
    }

    // Disable transition animations for bottom nav feel
    override fun onPause() {
        super.onPause()
        overridePendingTransition(0, 0)
    }

    companion object {
        fun start(context: Context) {
            val intent = Intent(context, ResidentNotificationsActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            context.startActivity(intent)
        }
    }
}
