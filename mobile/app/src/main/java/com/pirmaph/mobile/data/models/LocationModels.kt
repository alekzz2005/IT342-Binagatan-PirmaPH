package com.pirmaph.mobile.data.models

data class LocationItem(
    val code: String,
    val name: String
)

// We can use the same model for Region, Province, City, and Barangay
// since psgc.cloud API always returns at least 'code' and 'name' for these endpoints.
