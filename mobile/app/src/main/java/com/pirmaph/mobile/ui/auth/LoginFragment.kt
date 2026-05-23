package com.pirmaph.mobile.ui.auth

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.pirmaph.mobile.MainActivity
import com.pirmaph.mobile.R
import com.pirmaph.mobile.data.api.RetrofitClient
import com.pirmaph.mobile.data.local.TokenManager
import com.pirmaph.mobile.data.repository.AuthRepository
import kotlinx.coroutines.launch

class LoginFragment : Fragment() {

    private lateinit var etEmail: EditText
    private lateinit var etPassword: EditText
    private lateinit var btnLogin: Button
    private lateinit var tvForgotPassword: TextView
    private lateinit var authRepository: AuthRepository

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_login, container, false)

        etEmail = view.findViewById(R.id.etEmail)
        etPassword = view.findViewById(R.id.etPassword)
        btnLogin = view.findViewById(R.id.btnLogin)
        tvForgotPassword = view.findViewById(R.id.tvForgotPassword)

        val tokenManager = TokenManager(requireContext())
        val apiService = RetrofitClient.create(tokenManager)
        authRepository = AuthRepository(apiService, tokenManager)

        setupListeners()

        return view
    }

    private fun setupListeners() {
        tvForgotPassword.setOnClickListener {
            Toast.makeText(requireContext(), "Forgot password flow not implemented", Toast.LENGTH_SHORT).show()
        }

        btnLogin.setOnClickListener {
            val email = etEmail.text.toString().trim()
            val pass = etPassword.text.toString()

            if (email.isEmpty() || pass.isEmpty()) {
                Toast.makeText(requireContext(), "Email and password are required", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            lifecycleScope.launch {
                try {
                    val resp = authRepository.login(email, pass)
                    if (!resp.token.isNullOrEmpty()) {
                        startActivity(Intent(requireContext(), MainActivity::class.java))
                        requireActivity().finish()
                    } else {
                        Toast.makeText(requireContext(), "Login failed", Toast.LENGTH_SHORT).show()
                    }
                } catch (ex: Exception) {
                    Toast.makeText(requireContext(), "Error: ${ex.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
}
