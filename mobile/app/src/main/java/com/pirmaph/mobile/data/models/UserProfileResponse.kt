package com.pirmaph.mobile.data.models

data class UserProfileResponse(
    val id: String,
    val username: String,
    val email: String,
    val firstName: String,
    val middleName: String?,
    val lastName: String,
    val role: String,
    val status: String,
    val emailVerified: Boolean
)
