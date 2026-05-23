package com.pirmaph.mobile.data.models

data class RegisterRequest(
    val username: String,
    val email: String,
    val password: String,
    val firstName: String,
    val middleName: String?,
    val lastName: String,
    val birthDate: String, // Format: YYYY-MM-DD
    val sex: String, // M, F, O
    val phoneNumber: String,
    val street: String,
    val regionCode: String,
    val region: String,
    val provinceCode: String?,
    val province: String?,
    val cityMunCode: String,
    val city: String,
    val barangayCode: String,
    val barangay: String,
    val zipCode: String,
    val role: String // RESIDENT or OFFICER
)
