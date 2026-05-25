package com.pirmaph.mobile.data.models

data class SubmitRequestPayload(
    val documentType: String,
    val purpose: String,
    val copies: Int,
    val additionalDetails: String? = null
)
