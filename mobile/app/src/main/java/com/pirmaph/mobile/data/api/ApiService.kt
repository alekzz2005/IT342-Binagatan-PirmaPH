package com.pirmaph.mobile.data.api

import com.pirmaph.mobile.data.models.AuthResponse
import com.pirmaph.mobile.data.models.DocumentRequestResponse
import com.pirmaph.mobile.data.models.LoginRequest
import com.pirmaph.mobile.data.models.OfficerDocumentRequestResponse
import com.pirmaph.mobile.data.models.RegisterRequest
import com.pirmaph.mobile.data.models.SubmitRequestPayload
import com.pirmaph.mobile.data.models.UpdateStatusRequest
import com.pirmaph.mobile.data.models.UserProfileResponse
import okhttp3.MultipartBody
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.PUT
import retrofit2.http.Query

interface ApiService {
    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse

    @POST("api/auth/register")
    suspend fun register(@Body request: RegisterRequest): AuthResponse

    @GET("api/users/me")
    suspend fun getMe(): UserProfileResponse

    @GET("api/requests/resident/mine")
    suspend fun getMyRequests(): List<DocumentRequestResponse>

    @POST("api/requests/resident")
    suspend fun submitDocumentRequest(@Body request: SubmitRequestPayload): DocumentRequestResponse

    @Multipart
    @POST("api/requests/resident/{id}/attachments")
    suspend fun uploadRequestAttachment(
        @Path("id") requestId: String,
        @Part file: MultipartBody.Part
    ): Any

    @PUT("api/auth/change-password")
    suspend fun changePassword(@Body body: Map<String, String>): Any

    // Officer endpoints
    @GET("api/requests/officer/queue")
    suspend fun getOfficerQueue(
        @Query("status") status: String? = null
    ): List<OfficerDocumentRequestResponse>

    @GET("api/requests/officer/{requestId}")
    suspend fun getOfficerRequestById(
        @Path("requestId") requestId: String
    ): OfficerDocumentRequestResponse

    @PATCH("api/requests/officer/{requestId}/status")
    suspend fun updateOfficerRequestStatus(
        @Path("requestId") requestId: String,
        @Body body: UpdateStatusRequest
    ): OfficerDocumentRequestResponse
}
