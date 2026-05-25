package com.pirmaph.mobile.ui.auth

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.viewpager2.widget.ViewPager2
import com.pirmaph.mobile.R

class AuthActivity : AppCompatActivity() {

    companion object {
        fun start(context: Context) {
            val intent = Intent(context, AuthActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            context.startActivity(intent)
        }
    }

    private lateinit var tabLogin: TextView
    private lateinit var tabRegister: TextView
    private lateinit var viewPager: ViewPager2

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_auth)

        tabLogin = findViewById(R.id.tabLogin)
        tabRegister = findViewById(R.id.tabRegister)
        viewPager = findViewById(R.id.viewPagerAuth)

        val adapter = AuthPagerAdapter(this)
        viewPager.adapter = adapter

        // Sync Tabs to ViewPager
        viewPager.registerOnPageChangeCallback(object : ViewPager2.OnPageChangeCallback() {
            override fun onPageSelected(position: Int) {
                super.onPageSelected(position)
                updateTabs(position)
            }
        })

        // Sync ViewPager to Tabs
        tabLogin.setOnClickListener {
            viewPager.currentItem = 0
        }
        tabRegister.setOnClickListener {
            viewPager.currentItem = 1
        }
    }

    private fun updateTabs(position: Int) {
        if (position == 0) {
            tabLogin.setBackgroundResource(R.drawable.bg_tab_active)
            tabLogin.setTextColor(ContextCompat.getColor(this, R.color.pirma_blue))
            tabLogin.elevation = 4f

            tabRegister.setBackgroundResource(0)
            tabRegister.setTextColor(ContextCompat.getColor(this, R.color.pirma_text_muted))
            tabRegister.elevation = 0f
        } else {
            tabRegister.setBackgroundResource(R.drawable.bg_tab_active)
            tabRegister.setTextColor(ContextCompat.getColor(this, R.color.pirma_blue))
            tabRegister.elevation = 4f

            tabLogin.setBackgroundResource(0)
            tabLogin.setTextColor(ContextCompat.getColor(this, R.color.pirma_text_muted))
            tabLogin.elevation = 0f
        }
    }
}
