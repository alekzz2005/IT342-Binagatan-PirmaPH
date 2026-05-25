package com.pirmaph.mobile.ui.resident.dashboard

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pirmaph.mobile.data.api.RetrofitClient
import com.pirmaph.mobile.data.local.TokenManager
import com.pirmaph.mobile.data.models.DocumentRequestResponse
import com.pirmaph.mobile.data.models.UserProfileResponse
import kotlinx.coroutines.launch

class ResidentDashboardViewModel(private val tokenManager: TokenManager) : ViewModel() {

    private val apiService = RetrofitClient.create(tokenManager)

    private val _userProfile = MutableLiveData<UserProfileResponse>()
    val userProfile: LiveData<UserProfileResponse> get() = _userProfile

    private val _recentRequests = MutableLiveData<List<DocumentRequestResponse>>()
    val recentRequests: LiveData<List<DocumentRequestResponse>> get() = _recentRequests

    private val _error = MutableLiveData<String>()
    val error: LiveData<String> get() = _error

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> get() = _isLoading

    fun loadDashboardData() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                // Fetch User Profile
                val user = apiService.getMe()
                _userProfile.value = user

                // Fetch Requests
                val requests = apiService.getMyRequests()
                _recentRequests.value = requests
            } catch (e: Exception) {
                _error.value = "Failed to load dashboard: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
}
