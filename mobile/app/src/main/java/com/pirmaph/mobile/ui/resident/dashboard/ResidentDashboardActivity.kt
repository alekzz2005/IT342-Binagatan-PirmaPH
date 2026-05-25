package com.pirmaph.mobile.ui.resident.dashboard

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.pirmaph.mobile.R
import com.pirmaph.mobile.data.local.TokenManager
import com.pirmaph.mobile.data.models.DocumentRequestResponse
import com.pirmaph.mobile.ui.auth.AuthActivity

class ResidentDashboardActivity : AppCompatActivity() {

    private lateinit var tokenManager: TokenManager
    
    private val viewModel: ResidentDashboardViewModel by viewModels {
        ResidentDashboardViewModelFactory(tokenManager)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_resident_dashboard)

        tokenManager = TokenManager(this)

        // Check if user is logged in
        if (tokenManager.getToken() == null) {
            startActivity(Intent(this, AuthActivity::class.java))
            finish()
            return
        }

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.headerLayout)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(v.paddingLeft, systemBars.top + 44, v.paddingRight, v.paddingBottom)
            insets
        }

        setupObservers()
        viewModel.loadDashboardData()
    }

    private fun setupObservers() {
        viewModel.isLoading.observe(this) { isLoading ->
            // Optionally show a progress bar
        }

        viewModel.error.observe(this) { errorMsg ->
            Toast.makeText(this, errorMsg, Toast.LENGTH_LONG).show()
        }

        viewModel.userProfile.observe(this) { user ->
            findViewById<TextView>(R.id.tvGreeting).text = "Good morning, ${user.firstName} 👋"
            
            // Update Account Status Banner
            val tvAccountStatusTag = findViewById<TextView>(R.id.tvAccountStatusTag)
            val tvAccountStatusTitle = findViewById<TextView>(R.id.tvAccountStatusTitle)
            val tvAccountStatusDesc = findViewById<TextView>(R.id.tvAccountStatusDesc)
            val cardAccountStatus = findViewById<LinearLayout>(R.id.cardAccountStatus)
            val ivAccountStatusIcon = findViewById<ImageView>(R.id.ivAccountStatusIcon)

            if (user.status == "APPROVED") {
                tvAccountStatusTag.text = "VERIFIED"
                tvAccountStatusTag.setTextColor(Color.parseColor("#10B981"))
                tvAccountStatusTitle.text = "Account Verified"
                tvAccountStatusDesc.text = "You have full access to barangay services."
                cardAccountStatus.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#EEFDF4")) // Light green
                ivAccountStatusIcon.setColorFilter(Color.parseColor("#10B981"))
            } else {
                tvAccountStatusTag.text = user.status.replace("_", " ")
                tvAccountStatusTag.setTextColor(Color.parseColor("#0038A8"))
                tvAccountStatusTitle.text = "Account Verification in Progress"
                tvAccountStatusDesc.text = "Please wait for the barangay officers to approve your account."
                cardAccountStatus.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#FCD116")) // Gold
                ivAccountStatusIcon.setColorFilter(Color.parseColor("#0038A8"))
            }
        }

        viewModel.recentRequests.observe(this) { requests ->
            val pendingCount = requests.count { it.status == "PENDING" }
            val approvedCount = requests.count { it.status == "APPROVED" || it.status == "READY_FOR_PICKUP" }
            val rejectedCount = requests.count { it.status == "REJECTED" }
            
            // Update Subtitle
            findViewById<TextView>(R.id.tvGreetingSub).text = "${pendingCount} pending requests"

            // Update Stats
            findViewById<TextView>(R.id.tvTotalStats).text = requests.size.toString()
            findViewById<TextView>(R.id.tvPendingStats).text = pendingCount.toString()
            findViewById<TextView>(R.id.tvApprovedStats).text = approvedCount.toString()
            findViewById<TextView>(R.id.tvRejectedStats).text = rejectedCount.toString()

            // Update Recent Requests List
            val container = findViewById<LinearLayout>(R.id.llRecentRequestsContainer)
            container.removeAllViews()

            if (requests.isEmpty()) {
                val emptyTv = TextView(this)
                emptyTv.text = "No recent requests found."
                emptyTv.setPadding(20, 20, 20, 20)
                emptyTv.gravity = android.view.Gravity.CENTER
                emptyTv.setTextColor(Color.parseColor("#6B7A99"))
                container.addView(emptyTv)
            } else {
                // Show top 3 recent
                val topRequests = requests.sortedByDescending { it.requestTimestamp }.take(3)
                for (req in topRequests) {
                    val itemView = LayoutInflater.from(this).inflate(R.layout.item_recent_request, container, false)
                    
                    itemView.findViewById<TextView>(R.id.tvRequestName).text = req.documentType.replace("_", " ")
                    itemView.findViewById<TextView>(R.id.tvRequestDate).text = "${req.requestTimestamp.take(10)} · ${req.purpose}"
                    
                    val badge = itemView.findViewById<TextView>(R.id.tvRequestBadge)
                    badge.text = req.status
                    
                    when (req.status) {
                        "PENDING" -> {
                            badge.setTextColor(Color.parseColor("#A07800"))
                            badge.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#2EFCD116"))
                        }
                        "APPROVED", "READY_FOR_PICKUP", "COMPLETED" -> {
                            badge.setTextColor(Color.parseColor("#059669"))
                            badge.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#2E10B981"))
                        }
                        "REJECTED" -> {
                            badge.setTextColor(Color.parseColor("#CE1126"))
                            badge.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1ACE1126"))
                        }
                        else -> {
                            badge.setTextColor(Color.parseColor("#0038A8"))
                            badge.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1A0038A8"))
                        }
                    }
                    
                    container.addView(itemView)
                }
            }
        }
    }

    companion object {
        fun start(context: Context) {
            val intent = Intent(context, ResidentDashboardActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            context.startActivity(intent)
        }
    }
}
