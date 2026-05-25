package com.pirmaph.mobile.ui.resident.profile

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.pirmaph.mobile.R
import com.pirmaph.mobile.data.api.RetrofitClient
import com.pirmaph.mobile.data.local.TokenManager
import com.pirmaph.mobile.data.models.UserProfileResponse
import com.pirmaph.mobile.ui.auth.AuthActivity
import kotlinx.coroutines.launch

class ResidentProfileFragment : Fragment() {

    companion object {
        const val TAG = "ResidentProfileFragment"
    }

    private var profile: UserProfileResponse? = null

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View = inflater.inflate(R.layout.fragment_resident_profile, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        ViewCompat.setOnApplyWindowInsetsListener(view.findViewById(R.id.headerLayout)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(v.paddingLeft, systemBars.top + 44, v.paddingRight, v.paddingBottom)
            insets
        }

        setupActions(view)
        loadProfile(view)
    }

    private fun setupActions(view: View) {
        view.findViewById<Button>(R.id.btnUpdatePassword).setOnClickListener {
            handlePasswordUpdate(view)
        }

        view.findViewById<androidx.appcompat.widget.AppCompatButton>(R.id.btnLogout).setOnClickListener {
            val dialogView = LayoutInflater.from(requireContext()).inflate(R.layout.dialog_logout, null)
            val dialog = AlertDialog.Builder(requireContext())
                .setView(dialogView)
                .create()

            dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

            dialogView.findViewById<androidx.appcompat.widget.AppCompatButton>(R.id.btnCancelLogout).setOnClickListener {
                dialog.dismiss()
            }

            dialogView.findViewById<androidx.appcompat.widget.AppCompatButton>(R.id.btnConfirmLogout).setOnClickListener {
                dialog.dismiss()
                TokenManager(requireContext()).clear()
                AuthActivity.start(requireContext())
                requireActivity().finish()
            }

            dialog.show()
        }
    }

    private fun handlePasswordUpdate(view: View) {
        val current = view.findViewById<EditText>(R.id.etCurrentPassword).text.toString()
        val new = view.findViewById<EditText>(R.id.etNewPassword).text.toString()
        val confirm = view.findViewById<EditText>(R.id.etConfirmPassword).text.toString()

        if (current.isEmpty() || new.isEmpty() || confirm.isEmpty()) {
            Toast.makeText(requireContext(), "Please fill in all password fields.", Toast.LENGTH_SHORT).show()
            return
        }
        if (new != confirm) {
            Toast.makeText(requireContext(), "New password and confirmation do not match.", Toast.LENGTH_SHORT).show()
            return
        }
        if (new.length < 8) {
            Toast.makeText(requireContext(), "New password must be at least 8 characters.", Toast.LENGTH_SHORT).show()
            return
        }

        val btn = view.findViewById<Button>(R.id.btnUpdatePassword)
        val pb = view.findViewById<ProgressBar>(R.id.pbPasswordUpdate)
        btn.text = ""
        btn.isEnabled = false
        pb.visibility = View.VISIBLE

        val tokenManager = TokenManager(requireContext())
        val apiService = RetrofitClient.create(tokenManager)

        lifecycleScope.launch {
            try {
                apiService.changePassword(mapOf("currentPassword" to current, "newPassword" to new))
                Toast.makeText(requireContext(), "Password updated successfully.", Toast.LENGTH_LONG).show()
                view.findViewById<EditText>(R.id.etCurrentPassword).text.clear()
                view.findViewById<EditText>(R.id.etNewPassword).text.clear()
                view.findViewById<EditText>(R.id.etConfirmPassword).text.clear()
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "Failed: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                btn.text = "Update Password"
                btn.isEnabled = true
                pb.visibility = View.GONE
            }
        }
    }

    private fun loadProfile(view: View) {
        val pb = view.findViewById<ProgressBar>(R.id.progressBar)
        val tvError = view.findViewById<TextView>(R.id.tvError)
        val content = view.findViewById<View>(R.id.profileContentContainer)
        pb.visibility = View.VISIBLE
        content.visibility = View.GONE

        val tokenManager = TokenManager(requireContext())
        val apiService = RetrofitClient.create(tokenManager)

        lifecycleScope.launch {
            try {
                val user = apiService.getMe()
                profile = user
                bindProfile(view, user)
                tvError.visibility = View.GONE
                content.visibility = View.VISIBLE
            } catch (e: Exception) {
                tvError.text = "Failed to load profile: ${e.message}"
                tvError.visibility = View.VISIBLE
            } finally {
                pb.visibility = View.GONE
            }
        }
    }

    private fun bindProfile(view: View, user: UserProfileResponse) {
        val firstName = user.firstName
        val lastName = user.lastName
        val middle = user.middleName
        val fullName = listOfNotNull(firstName, middle, lastName).joinToString(" ")
        val initials = "${firstName.firstOrNull() ?: ""}${lastName.firstOrNull() ?: ""}".uppercase()

        view.findViewById<TextView>(R.id.tvInitials).text = initials.ifEmpty { "??" }
        view.findViewById<TextView>(R.id.tvFullName).text = fullName.ifEmpty { "N/A" }
        view.findViewById<TextView>(R.id.tvRole).text = "Resident · ${user.role}"
        view.findViewById<TextView>(R.id.tvEmail).text = user.email
        view.findViewById<TextView>(R.id.tvUsername).text = user.username
        view.findViewById<TextView>(R.id.tvStatus).text = user.status.replace("_", " ")

        view.findViewById<TextView>(R.id.tvFirstName).text = firstName.ifEmpty { "—" }
        view.findViewById<TextView>(R.id.tvMiddleName).text = middle ?: "—"
        view.findViewById<TextView>(R.id.tvLastName).text = lastName.ifEmpty { "—" }
        view.findViewById<TextView>(R.id.tvEmailDetail).text = user.email.ifEmpty { "—" }
        view.findViewById<TextView>(R.id.tvEmailVerified).text = if (user.emailVerified) "✓ Verified" else "Not Verified"
    }
}
