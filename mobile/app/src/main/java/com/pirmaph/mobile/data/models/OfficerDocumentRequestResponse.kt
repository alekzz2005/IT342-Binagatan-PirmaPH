package com.pirmaph.mobile.data.models

data class OfficerDocumentRequestResponse(
    val id: String,
    val documentType: String?,
    val purpose: String?,
    val status: String?,
    val requestTimestamp: String?,
    val residentFullName: String?,
    val residentEmail: String?,
    val barangayCode: String?,
    val officerRemarks: String?,
    val additionalDetails: String?,
    val assignedOfficerUserId: String?,
    val files: List<OfficerRequestFileResponse>?
)
