package com.pirmaph.mobile.data.repository

import com.pirmaph.mobile.data.api.ApiService
import com.pirmaph.mobile.data.local.TokenManager
import com.pirmaph.mobile.data.models.LoginRequest
import com.pirmaph.mobile.data.models.RegisterRequest

class AuthRepository(private val api: ApiService, private val tokenManager: TokenManager) {
    suspend fun login(email: String, password: String) =
        api.login(LoginRequest(email, password)).also {
            it.token?.let { t -> tokenManager.saveToken(t) }
        }

    suspend fun register(request: RegisterRequest) =
        api.register(request)
}
