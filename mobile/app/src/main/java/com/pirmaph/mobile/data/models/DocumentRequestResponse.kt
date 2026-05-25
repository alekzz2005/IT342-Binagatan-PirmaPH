package com.pirmaph.mobile.data.models

data class DocumentRequestResponse(
    val id: String,
    val documentType: String,
    val purpose: String,
    val status: String,
    val requestTimestamp: String,
    val amountDue: Double?
)
