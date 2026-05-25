package com.pirmaph.mobile.ui.resident.dashboard

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pirmaph.mobile.data.api.RetrofitClient
import com.pirmaph.mobile.data.local.TokenManager
import com.pirmaph.mobile.data.repository.DashboardRepository
import kotlinx.coroutines.launch

data class AnnouncementItem(
    val title: String,
    val body: String,
    val dateStr: String,
    val badgeLabel: String,
    val badgeColorHex: String
)

class ResidentNotificationsViewModel(private val tokenManager: TokenManager) : ViewModel() {

    private val apiService = RetrofitClient.create(tokenManager)
    private val repository = DashboardRepository.getInstance(apiService)

    private val _announcements = MutableLiveData<List<AnnouncementItem>>()
    val announcements: LiveData<List<AnnouncementItem>> get() = _announcements

    private val _error = MutableLiveData<String>()
    val error: LiveData<String> get() = _error

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> get() = _isLoading

    fun loadNotifications(forceRefresh: Boolean = false) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = ""
            try {
                // Fetch Requests from Cache or API
                val requests = repository.getMyRequests(forceRefresh)
                
                // Sort requests by date descending
                val sortedRequests = requests.sortedByDescending { it.requestTimestamp }

                // Top announcements (all sorted requests map to updates for now)
                val announcementItems = sortedRequests.map { req ->
                    val badgeLabel = when(req.status) {
                        "SUBMITTED", "UNDER_REVIEW" -> "Info"
                        "APPROVED", "READY_FOR_RELEASE" -> "Approved"
                        "DECLINED", "PENDING_PAYMENT" -> "Alert"
                        else -> "Info"
                    }
                    val badgeColorHex = when(req.status) {
                        "SUBMITTED", "UNDER_REVIEW" -> "#2196F3" // Blue
                        "APPROVED", "READY_FOR_RELEASE" -> "#10B981" // Green
                        "DECLINED", "PENDING_PAYMENT" -> "#EF4444" // Red
                        else -> "#2196F3"
                    }
                    val releaseLabel = when(req.status) {
                        "READY_FOR_RELEASE" -> "Ready for release"
                        "APPROVED" -> "Approved and in process"
                        "DECLINED" -> "Action required"
                        else -> "Processing update"
                    }
                    val formattedDocType = req.documentType.replace("_", " ").split(" ").joinToString(" ") { it.capitalize() }
                    
                    AnnouncementItem(
                        title = "$formattedDocType $releaseLabel",
                        body = "Submitted for ${req.purpose}.",
                        dateStr = "Updated just now", // Ideally parse ISO timestamp
                        badgeLabel = badgeLabel,
                        badgeColorHex = badgeColorHex
                    )
                }
                _announcements.value = announcementItems

            } catch (e: Exception) {
                _error.value = "Failed to load notifications: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
}
