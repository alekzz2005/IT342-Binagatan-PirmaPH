package com.pirmaph.mobile.ui.resident.dashboard

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.FrameLayout
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
import java.util.Calendar

class ResidentDashboardActivity : AppCompatActivity() {

    private val viewModel: ResidentDashboardViewModel by viewModels {
        ResidentDashboardViewModelFactory(TokenManager(this))
    }

    private lateinit var recentRequestsAdapter: RecentRequestsAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_resident_dashboard)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.headerLayout)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(v.paddingLeft, systemBars.top + 44, v.paddingRight, v.paddingBottom)
            insets
        }

        setupRecyclerViews()
        setupListeners()
        setupObservers()
        viewModel.loadDashboardData()
    }

    private fun setupRecyclerViews() {
        recentRequestsAdapter = RecentRequestsAdapter()
        findViewById<RecyclerView>(R.id.rvRecentRequests).adapter = recentRequestsAdapter
    }

    private fun setupListeners() {
        findViewById<FrameLayout>(R.id.fabNewRequest).setOnClickListener {
            com.pirmaph.mobile.ui.resident.requests.SubmitRequestActivity.start(this)
        }

        val navRequests = findViewById<View>(R.id.navRequests)
        navRequests?.setOnClickListener {
            com.pirmaph.mobile.ui.resident.requests.ResidentRequestsActivity.start(this)
            overridePendingTransition(0, 0)
        }

        findViewById<LinearLayout>(R.id.navNotification).setOnClickListener {
            ResidentNotificationsActivity.start(this)
            overridePendingTransition(0, 0)
        }
    }

    override fun onPause() {
        super.onPause()
        overridePendingTransition(0, 0)
    }

    private fun getGreeting(): String {
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        return when {
            hour < 12 -> "Good morning"
            hour < 18 -> "Good afternoon"
            else -> "Good evening"
        }
    }

    private fun setupObservers() {
        val progressBar = findViewById<ProgressBar>(R.id.progressBar)
        val contentLayout = findViewById<LinearLayout>(R.id.contentLayout)
        val tvError = findViewById<TextView>(R.id.tvError)

        viewModel.isLoading.observe(this) { isLoading ->
            progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
            contentLayout.alpha = if (isLoading) 0.5f else 1.0f
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

        viewModel.userProfile.observe(this) { user ->
            val firstName = user.firstName ?: "Resident"
            findViewById<TextView>(R.id.tvGreeting).text = "${getGreeting()}, $firstName !"
        }

        viewModel.stats.observe(this) { stats ->
            findViewById<TextView>(R.id.tvTotalStats).text = stats.total.toString()
            findViewById<TextView>(R.id.tvPendingStats).text = stats.pending.toString()
            findViewById<TextView>(R.id.tvApprovedStats).text = stats.approved.toString()
            findViewById<TextView>(R.id.tvRejectedStats).text = stats.rejected.toString()

            val pendingMsg = if (stats.pending == 1) "request" else "requests"
            val approvedMsg = if (stats.approved == 1) "request" else "requests"

            findViewById<TextView>(R.id.tvGreetingSub).text = "You have ${stats.pending} pending $pendingMsg and ${stats.approved} approved $approvedMsg."
        }

        viewModel.recentRequests.observe(this) { requests ->
            recentRequestsAdapter.submitList(requests)
            findViewById<TextView>(R.id.tvEmptyRecentRequests).visibility = if (requests.isEmpty()) View.VISIBLE else View.GONE
        }
    }

    companion object {
        fun start(context: Context) {
            val intent = Intent(context, ResidentDashboardActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            context.startActivity(intent)
        }

        // Called only from AuthActivity after login — clears the entire back stack
        fun startAfterLogin(context: Context) {
            val intent = Intent(context, ResidentDashboardActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            context.startActivity(intent)
        }
    }
}
