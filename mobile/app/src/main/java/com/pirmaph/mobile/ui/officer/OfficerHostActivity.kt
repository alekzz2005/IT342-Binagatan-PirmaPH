package com.pirmaph.mobile.ui.officer

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import com.pirmaph.mobile.R
import com.pirmaph.mobile.ui.officer.profile.OfficerProfileFragment
import com.pirmaph.mobile.ui.officer.requests.OfficerRequestsFragment

class OfficerHostActivity : AppCompatActivity() {

    enum class Tab { QUEUE, PROFILE }

    private var currentTab = Tab.QUEUE

    private lateinit var navQueue: LinearLayout
    private lateinit var navProfile: LinearLayout
    private lateinit var navQueueIcon: ImageView
    private lateinit var navProfileIcon: ImageView
    private lateinit var navQueueLabel: TextView
    private lateinit var navProfileLabel: TextView
    private lateinit var navQueueDot: View
    private lateinit var navProfileDot: View

    companion object {
        private const val EXTRA_TAB = "officer_tab"

        fun start(context: Context, tab: Tab = Tab.QUEUE) {
            val intent = Intent(context, OfficerHostActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            intent.putExtra(EXTRA_TAB, tab.name)
            context.startActivity(intent)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_officer_host)

        bindViews()
        setupNavigation()

        val tabName = savedInstanceState?.getString(EXTRA_TAB)
            ?: intent.getStringExtra(EXTRA_TAB)
            ?: Tab.QUEUE.name
        val tab = try { Tab.valueOf(tabName) } catch (e: Exception) { Tab.QUEUE }

        if (savedInstanceState == null) {
            switchTab(tab, forceLoad = true)
        } else {
            currentTab = tab
            updateNavIndicator(tab)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putString(EXTRA_TAB, currentTab.name)
    }

    private fun bindViews() {
        navQueue = findViewById(R.id.navOfficerQueue)
        navProfile = findViewById(R.id.navOfficerProfile)
        navQueueIcon = findViewById(R.id.navQueueIcon)
        navProfileIcon = findViewById(R.id.navOfficerProfileIcon)
        navQueueLabel = findViewById(R.id.navQueueLabel)
        navProfileLabel = findViewById(R.id.navOfficerProfileLabel)
        navQueueDot = findViewById(R.id.navQueueDot)
        navProfileDot = findViewById(R.id.navOfficerProfileDot)
    }

    private fun setupNavigation() {
        navQueue.setOnClickListener { switchTab(Tab.QUEUE) }
        navProfile.setOnClickListener { switchTab(Tab.PROFILE) }
    }

    fun switchTab(tab: Tab, forceLoad: Boolean = false) {
        if (tab == currentTab && !forceLoad) return
        currentTab = tab

        val fragment: Fragment = when (tab) {
            Tab.QUEUE -> getOrCreate(OfficerRequestsFragment.TAG) { OfficerRequestsFragment() }
            Tab.PROFILE -> getOrCreate(OfficerProfileFragment.TAG) { OfficerProfileFragment() }
        }

        supportFragmentManager.beginTransaction()
            .replace(R.id.officerFragmentContainer, fragment, tab.name)
            .commitNow()

        updateNavIndicator(tab)
    }

    private fun <T : Fragment> getOrCreate(tag: String, create: () -> T): T {
        @Suppress("UNCHECKED_CAST")
        return (supportFragmentManager.findFragmentByTag(tag) as? T) ?: create()
    }

    private fun updateNavIndicator(activeTab: Tab) {
        val blue = ContextCompat.getColor(this, R.color.pirma_blue)
        val muted = ContextCompat.getColor(this, R.color.pirma_text_muted)

        listOf(navQueueIcon, navProfileIcon)
            .forEach { it.imageTintList = android.content.res.ColorStateList.valueOf(muted) }
        listOf(navQueueLabel, navProfileLabel)
            .forEach { it.setTextColor(muted) }
        listOf(navQueueDot, navProfileDot)
            .forEach { it.visibility = View.GONE }

        when (activeTab) {
            Tab.QUEUE -> {
                navQueueIcon.imageTintList = android.content.res.ColorStateList.valueOf(blue)
                navQueueLabel.setTextColor(blue)
                navQueueDot.visibility = View.VISIBLE
            }
            Tab.PROFILE -> {
                navProfileIcon.imageTintList = android.content.res.ColorStateList.valueOf(blue)
                navProfileLabel.setTextColor(blue)
                navProfileDot.visibility = View.VISIBLE
            }
        }
    }
}
