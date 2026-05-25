package com.pirmaph.mobile.ui.resident.dashboard

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
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.RecyclerView
import com.pirmaph.mobile.R
import com.pirmaph.mobile.data.local.TokenManager
import com.pirmaph.mobile.ui.resident.ResidentHostActivity
import java.util.Calendar

class ResidentHomeFragment : Fragment() {

    companion object {
        const val TAG = "ResidentHomeFragment"
    }

    private val viewModel: ResidentDashboardViewModel by viewModels {
        ResidentDashboardViewModelFactory(TokenManager(requireContext()))
    }

    private lateinit var recentRequestsAdapter: RecentRequestsAdapter

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View = inflater.inflate(R.layout.fragment_resident_home, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Apply window insets to header
        ViewCompat.setOnApplyWindowInsetsListener(view.findViewById(R.id.headerLayout)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(v.paddingLeft, systemBars.top + 44, v.paddingRight, v.paddingBottom)
            insets
        }

        recentRequestsAdapter = RecentRequestsAdapter()
        view.findViewById<RecyclerView>(R.id.rvRecentRequests).adapter = recentRequestsAdapter

        // "See All" taps → switch to Requests tab
        view.findViewById<TextView>(R.id.tvSeeAllRequests).setOnClickListener {
            (activity as? ResidentHostActivity)?.switchTab(ResidentHostActivity.Tab.REQUESTS)
        }

        setupObservers(view)
        viewModel.loadDashboardData()
    }

    private fun getGreeting(): String {
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        return when {
            hour < 12 -> "Good morning"
            hour < 18 -> "Good afternoon"
            else -> "Good evening"
        }
    }

    private fun setupObservers(view: View) {
        val progressBar = view.findViewById<ProgressBar>(R.id.progressBar)
        val contentLayout = view.findViewById<LinearLayout>(R.id.contentLayout)
        val tvError = view.findViewById<TextView>(R.id.tvError)

        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
            contentLayout.alpha = if (isLoading) 0.5f else 1.0f
        }

        viewModel.error.observe(viewLifecycleOwner) { errorMsg ->
            if (!errorMsg.isNullOrEmpty()) {
                tvError.visibility = View.VISIBLE
                tvError.text = errorMsg
                Toast.makeText(requireContext(), errorMsg, Toast.LENGTH_LONG).show()
            } else {
                tvError.visibility = View.GONE
            }
        }

        viewModel.userProfile.observe(viewLifecycleOwner) { user ->
            val firstName = user?.firstName ?: "Resident"
            view.findViewById<TextView>(R.id.tvGreeting).text = "${getGreeting()}, $firstName !"
        }

        viewModel.stats.observe(viewLifecycleOwner) { stats ->
            view.findViewById<TextView>(R.id.tvTotalStats).text = stats.total.toString()
            view.findViewById<TextView>(R.id.tvPendingStats).text = stats.pending.toString()
            view.findViewById<TextView>(R.id.tvApprovedStats).text = stats.approved.toString()
            view.findViewById<TextView>(R.id.tvRejectedStats).text = stats.rejected.toString()

            val pendingWord = if (stats.pending == 1) "request" else "requests"
            val approvedWord = if (stats.approved == 1) "request" else "requests"
            view.findViewById<TextView>(R.id.tvGreetingSub).text =
                "You have ${stats.pending} pending $pendingWord and ${stats.approved} approved $approvedWord."
        }

        viewModel.recentRequests.observe(viewLifecycleOwner) { requests ->
            recentRequestsAdapter.submitList(requests)
            view.findViewById<TextView>(R.id.tvEmptyRecentRequests).visibility =
                if (requests.isEmpty()) View.VISIBLE else View.GONE
        }
    }
}
