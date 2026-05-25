package com.pirmaph.mobile.ui.resident.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.pirmaph.mobile.data.local.TokenManager

class ResidentNotificationsViewModelFactory(private val tokenManager: TokenManager) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(ResidentNotificationsViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return ResidentNotificationsViewModel(tokenManager) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
