package com.pirmaph.mobile.data.api

import com.pirmaph.mobile.data.models.AuthResponse
import com.pirmaph.mobile.data.models.DocumentRequestResponse
import com.pirmaph.mobile.data.models.LoginRequest
import com.pirmaph.mobile.data.models.RegisterRequest
import com.pirmaph.mobile.data.models.UserProfileResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface ApiService {
    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse

    @POST("api/auth/register")
    suspend fun register(@Body request: RegisterRequest): AuthResponse

    @GET("api/users/me")
    suspend fun getMe(): UserProfileResponse

    @GET("api/requests/resident/mine")
    suspend fun getMyRequests(): List<DocumentRequestResponse>
}
