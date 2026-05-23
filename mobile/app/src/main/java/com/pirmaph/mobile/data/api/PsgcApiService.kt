package com.pirmaph.mobile.data.api

import com.pirmaph.mobile.data.models.LocationItem
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET
import retrofit2.http.Path
import java.util.concurrent.TimeUnit

interface PsgcApiService {
    @GET("regions")
    suspend fun getRegions(): List<LocationItem>

    @GET("regions/{regionCode}/provinces")
    suspend fun getProvincesByRegion(@Path("regionCode") regionCode: String): List<LocationItem>

    @GET("regions/{regionCode}/cities-municipalities")
    suspend fun getCitiesByRegion(@Path("regionCode") regionCode: String): List<LocationItem>

    @GET("provinces/{provinceCode}/cities-municipalities")
    suspend fun getCitiesByProvince(@Path("provinceCode") provinceCode: String): List<LocationItem>

    @GET("cities-municipalities/{cityMunCode}/barangays")
    suspend fun getBarangaysByCity(@Path("cityMunCode") cityMunCode: String): List<LocationItem>
}

object PsgcRetrofitClient {
    private const val BASE_URL = "https://psgc.cloud/api/"

    fun create(): PsgcApiService {
        val logging = HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BODY }
        val client = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(logging)
            .build()

        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(PsgcApiService::class.java)
    }
}
