package com.pirmaph.mobile.data.local

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class TokenManager(context: Context) {
    private val prefsName = "pirmaph_prefs"
    private val keyToken = "jwt_token"
    private val sharedPreferences = EncryptedSharedPreferences.create(
        context,
        prefsName,
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun saveToken(token: String) {
        sharedPreferences.edit().putString(keyToken, token).apply()
    }

    fun getToken(): String? = sharedPreferences.getString(keyToken, null)

    fun clear() { sharedPreferences.edit().remove(keyToken).apply() }
}
