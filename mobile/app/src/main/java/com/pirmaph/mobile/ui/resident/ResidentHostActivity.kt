package com.pirmaph.mobile.ui.resident

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import com.pirmaph.mobile.R
import com.pirmaph.mobile.ui.resident.dashboard.ResidentHomeFragment
import com.pirmaph.mobile.ui.resident.dashboard.ResidentNotificationsFragment
import com.pirmaph.mobile.ui.resident.profile.ResidentProfileFragment
import com.pirmaph.mobile.ui.resident.requests.ResidentRequestsFragment
import com.pirmaph.mobile.ui.resident.requests.SubmitRequestActivity

class ResidentHostActivity : AppCompatActivity() {

    enum class Tab { HOME, REQUESTS, NOTIFICATIONS, PROFILE }

    private var currentTab = Tab.HOME

    // Nav item references
    private lateinit var navHome: LinearLayout
    private lateinit var navRequests: LinearLayout
    private lateinit var navNotification: LinearLayout
    private lateinit var navProfile: LinearLayout

    // Icons
    private lateinit var navHomeIcon: ImageView
    private lateinit var navRequestsIcon: ImageView
    private lateinit var navNotificationIcon: ImageView
    private lateinit var navProfileIcon: ImageView

    // Labels
    private lateinit var navHomeLabel: TextView
    private lateinit var navRequestsLabel: TextView
    private lateinit var navNotificationLabel: TextView
    private lateinit var navProfileLabel: TextView

    // Dots
    private lateinit var navHomeDot: View
    private lateinit var navRequestsDot: View
    private lateinit var navNotificationDot: View
    private lateinit var navProfileDot: View

    companion object {
        private const val EXTRA_TAB = "extra_tab"

        fun start(context: Context, tab: Tab = Tab.HOME) {
            val intent = Intent(context, ResidentHostActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            intent.putExtra(EXTRA_TAB, tab.name)
            context.startActivity(intent)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_resident_host)

        bindViews()
        setupNavigation()

        // Restore saved tab or use intent extra
        val tabName = savedInstanceState?.getString(EXTRA_TAB)
            ?: intent.getStringExtra(EXTRA_TAB)
            ?: Tab.HOME.name
        val tab = try { Tab.valueOf(tabName) } catch (e: Exception) { Tab.HOME }

        if (savedInstanceState == null) {
            switchTab(tab, forceLoad = true)
        } else {
            // Restore current tab indicator only — fragment manager handles the rest
            currentTab = tab
            updateNavIndicator(tab)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putString(EXTRA_TAB, currentTab.name)
    }

    private fun bindViews() {
        navHome = findViewById(R.id.navHome)
        navRequests = findViewById(R.id.navRequests)
        navNotification = findViewById(R.id.navNotification)
        navProfile = findViewById(R.id.navProfile)

        navHomeIcon = findViewById(R.id.navHomeIcon)
        navRequestsIcon = findViewById(R.id.navRequestsIcon)
        navNotificationIcon = findViewById(R.id.navNotificationIcon)
        navProfileIcon = findViewById(R.id.navProfileIcon)

        navHomeLabel = findViewById(R.id.navHomeLabel)
        navRequestsLabel = findViewById(R.id.navRequestsLabel)
        navNotificationLabel = findViewById(R.id.navNotificationLabel)
        navProfileLabel = findViewById(R.id.navProfileLabel)

        navHomeDot = findViewById(R.id.navHomeDot)
        navRequestsDot = findViewById(R.id.navRequestsDot)
        navNotificationDot = findViewById(R.id.navNotificationDot)
        navProfileDot = findViewById(R.id.navProfileDot)
    }

    private fun setupNavigation() {
        navHome.setOnClickListener { switchTab(Tab.HOME) }
        navRequests.setOnClickListener { switchTab(Tab.REQUESTS) }
        navNotification.setOnClickListener { switchTab(Tab.NOTIFICATIONS) }
        navProfile.setOnClickListener { switchTab(Tab.PROFILE) }
        findViewById<FrameLayout>(R.id.fabNewRequest).setOnClickListener {
            SubmitRequestActivity.start(this)
        }
    }

    fun switchTab(tab: Tab, forceLoad: Boolean = false) {
        if (tab == currentTab && !forceLoad) return
        currentTab = tab

        val fragment: Fragment = when (tab) {
            Tab.HOME -> getOrCreateFragment(ResidentHomeFragment.TAG) { ResidentHomeFragment() }
            Tab.REQUESTS -> getOrCreateFragment(ResidentRequestsFragment.TAG) { ResidentRequestsFragment() }
            Tab.NOTIFICATIONS -> getOrCreateFragment(ResidentNotificationsFragment.TAG) { ResidentNotificationsFragment() }
            Tab.PROFILE -> getOrCreateFragment(ResidentProfileFragment.TAG) { ResidentProfileFragment() }
        }

        supportFragmentManager.beginTransaction()
            .replace(R.id.fragmentContainer, fragment, tab.name)
            .commitNow()

        updateNavIndicator(tab)
    }

    private fun <T : Fragment> getOrCreateFragment(tag: String, create: () -> T): T {
        @Suppress("UNCHECKED_CAST")
        return (supportFragmentManager.findFragmentByTag(tag) as? T) ?: create()
    }

    private fun updateNavIndicator(activeTab: Tab) {
        val blue = ContextCompat.getColor(this, R.color.pirma_blue)
        val muted = ContextCompat.getColor(this, R.color.pirma_text_muted)

        // Reset all to muted
        listOf(navHomeIcon, navRequestsIcon, navNotificationIcon, navProfileIcon)
            .forEach { it.imageTintList = android.content.res.ColorStateList.valueOf(muted) }
        listOf(navHomeLabel, navRequestsLabel, navNotificationLabel, navProfileLabel)
            .forEach { it.setTextColor(muted) }
        listOf(navHomeDot, navRequestsDot, navNotificationDot, navProfileDot)
            .forEach { it.visibility = View.GONE }

        // Activate selected
        when (activeTab) {
            Tab.HOME -> {
                navHomeIcon.imageTintList = android.content.res.ColorStateList.valueOf(blue)
                navHomeLabel.setTextColor(blue)
                navHomeDot.visibility = View.VISIBLE
            }
            Tab.REQUESTS -> {
                navRequestsIcon.imageTintList = android.content.res.ColorStateList.valueOf(blue)
                navRequestsLabel.setTextColor(blue)
                navRequestsDot.visibility = View.VISIBLE
            }
            Tab.NOTIFICATIONS -> {
                navNotificationIcon.imageTintList = android.content.res.ColorStateList.valueOf(blue)
                navNotificationLabel.setTextColor(blue)
                navNotificationDot.visibility = View.VISIBLE
            }
            Tab.PROFILE -> {
                navProfileIcon.imageTintList = android.content.res.ColorStateList.valueOf(blue)
                navProfileLabel.setTextColor(blue)
                navProfileDot.visibility = View.VISIBLE
            }
        }
    }
}
