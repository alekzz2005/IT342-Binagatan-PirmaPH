package com.pirmaph.mobile.ui.resident.dashboard

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
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.RecyclerView
import com.pirmaph.mobile.R
import com.pirmaph.mobile.data.local.TokenManager

class ResidentNotificationsFragment : Fragment() {

    companion object {
        const val TAG = "ResidentNotificationsFragment"
    }

    private val viewModel: ResidentNotificationsViewModel by viewModels {
        ResidentNotificationsViewModelFactory(TokenManager(requireContext()))
    }

    private lateinit var announcementsAdapter: AnnouncementsAdapter

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View = inflater.inflate(R.layout.fragment_resident_notifications, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        ViewCompat.setOnApplyWindowInsetsListener(view.findViewById(R.id.headerLayout)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(v.paddingLeft, systemBars.top + 44, v.paddingRight, v.paddingBottom)
            insets
        }

        announcementsAdapter = AnnouncementsAdapter()
        view.findViewById<RecyclerView>(R.id.rvAnnouncements).adapter = announcementsAdapter

        setupObservers(view)
        viewModel.loadNotifications()
    }

    private fun setupObservers(view: View) {
        val progressBar = view.findViewById<ProgressBar>(R.id.progressBar)
        val tvError = view.findViewById<TextView>(R.id.tvError)

        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
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

        viewModel.announcements.observe(viewLifecycleOwner) { items ->
            announcementsAdapter.submitList(items)
            view.findViewById<TextView>(R.id.tvEmptyAnnouncements).visibility =
                if (items.isEmpty()) View.VISIBLE else View.GONE
        }
    }
}
