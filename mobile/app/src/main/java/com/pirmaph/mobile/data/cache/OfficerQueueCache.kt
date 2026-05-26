package com.pirmaph.mobile.data.cache

import com.pirmaph.mobile.data.models.OfficerDocumentRequestResponse

/**
 * In-memory cache for officer queue data.
 * Holds a single list and a timestamp; expires after [TTL_MS] milliseconds.
 * Both OfficerRequestsFragment and OfficerDashboardFragment read from / write to this cache
 * so switching tabs doesn't trigger a full reload.
 */
object OfficerQueueCache {

    private const val TTL_MS = 60_000L // 1 minute

    private var cachedData: List<OfficerDocumentRequestResponse> = emptyList()
    private var lastFetchedAt: Long = 0L
    private var isFetching: Boolean = false

    /** Returns non-empty cached data that is still within the TTL, or null otherwise. */
    fun get(): List<OfficerDocumentRequestResponse>? {
        val age = System.currentTimeMillis() - lastFetchedAt
        return if (cachedData.isNotEmpty() && age < TTL_MS) cachedData else null
    }

    fun set(data: List<OfficerDocumentRequestResponse>) {
        cachedData = data
        lastFetchedAt = System.currentTimeMillis()
        isFetching = false
    }

    /** Call when an action (approve/reject/ready) is performed to force a refresh. */
    fun invalidate() {
        lastFetchedAt = 0L
    }

    fun isFetching(): Boolean = isFetching
    fun setFetching(value: Boolean) { isFetching = value }
}
