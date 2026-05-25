package com.pirmaph.mobile.data.repository

import com.pirmaph.mobile.data.api.ApiService
import com.pirmaph.mobile.data.models.DocumentRequestResponse
import com.pirmaph.mobile.data.models.UserProfileResponse

class DashboardRepository(private val apiService: ApiService) {

    // In-memory cache
    private var cachedUserProfile: UserProfileResponse? = null
    private var cachedRequests: List<DocumentRequestResponse>? = null

    suspend fun getUserProfile(forceRefresh: Boolean = false): UserProfileResponse {
        if (!forceRefresh && cachedUserProfile != null) {
            return cachedUserProfile!!
        }
        val response = apiService.getMe()
        cachedUserProfile = response
        return response
    }

    suspend fun getMyRequests(forceRefresh: Boolean = false): List<DocumentRequestResponse> {
        if (!forceRefresh && cachedRequests != null) {
            return cachedRequests!!
        }
        val response = apiService.getMyRequests()
        cachedRequests = response
        return response
    }

    fun clearCache() {
        cachedUserProfile = null
        cachedRequests = null
    }

    companion object {
        @Volatile
        private var instance: DashboardRepository? = null

        fun getInstance(apiService: ApiService): DashboardRepository {
            return instance ?: synchronized(this) {
                instance ?: DashboardRepository(apiService).also { instance = it }
            }
        }
    }
}
