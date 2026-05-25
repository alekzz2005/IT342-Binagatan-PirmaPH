package com.pirmaph.mobile.ui.resident.dashboard

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pirmaph.mobile.data.api.RetrofitClient
import com.pirmaph.mobile.data.local.TokenManager
import com.pirmaph.mobile.data.models.DocumentRequestResponse
import com.pirmaph.mobile.data.models.UserProfileResponse
import com.pirmaph.mobile.data.repository.DashboardRepository
import kotlinx.coroutines.launch

data class DashboardStats(
    val total: Int = 0,
    val pending: Int = 0,
    val approved: Int = 0,
    val rejected: Int = 0
)

class ResidentDashboardViewModel(private val tokenManager: TokenManager) : ViewModel() {

    private val apiService = RetrofitClient.create(tokenManager)
    private val repository = DashboardRepository.getInstance(apiService)

    private val _userProfile = MutableLiveData<UserProfileResponse>()
    val userProfile: LiveData<UserProfileResponse> get() = _userProfile

    private val _stats = MutableLiveData<DashboardStats>()
    val stats: LiveData<DashboardStats> get() = _stats

    private val _recentRequests = MutableLiveData<List<DocumentRequestResponse>>()
    val recentRequests: LiveData<List<DocumentRequestResponse>> get() = _recentRequests

    private val _error = MutableLiveData<String>()
    val error: LiveData<String> get() = _error

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> get() = _isLoading

    fun loadDashboardData(forceRefresh: Boolean = false) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = ""
            try {
                // Fetch User Profile
                val user = repository.getUserProfile(forceRefresh)
                _userProfile.value = user

                // Fetch Requests
                val requests = repository.getMyRequests(forceRefresh)
                
                // Sort requests by date descending
                val sortedRequests = requests.sortedByDescending { it.requestTimestamp }
                
                // Calculate Stats
                var pending = 0
                var approved = 0
                var rejected = 0
                
                for (req in sortedRequests) {
                    when (req.status) {
                        "SUBMITTED", "UNDER_REVIEW", "PENDING_PAYMENT" -> pending++
                        "APPROVED", "READY_FOR_RELEASE" -> approved++
                        "DECLINED" -> rejected++
                    }
                }
                
                _stats.value = DashboardStats(
                    total = sortedRequests.size,
                    pending = pending,
                    approved = approved,
                    rejected = rejected
                )

                // Top 5 recent requests
                _recentRequests.value = sortedRequests.take(5)

            } catch (e: Exception) {
                _error.value = "Failed to load dashboard: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
}
