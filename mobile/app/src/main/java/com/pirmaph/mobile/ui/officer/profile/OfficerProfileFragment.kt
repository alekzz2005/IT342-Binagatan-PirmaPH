package com.pirmaph.mobile.ui.officer.profile

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

class OfficerProfileFragment : Fragment() {

    companion object {
        const val TAG = "OfficerProfileFragment"
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View = inflater.inflate(R.layout.fragment_officer_profile, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        ViewCompat.setOnApplyWindowInsetsListener(view.findViewById(R.id.officerProfileHeader)) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(v.paddingLeft, bars.top + 44, v.paddingRight, v.paddingBottom)
            insets
        }

        setupActions(view)
        loadProfile(view)
    }

    private fun setupActions(view: View) {
        view.findViewById<Button>(R.id.btnOfficerUpdatePassword).setOnClickListener {
            handlePasswordUpdate(view)
        }

        view.findViewById<androidx.appcompat.widget.AppCompatButton>(R.id.btnOfficerLogout).setOnClickListener {
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
        val current = view.findViewById<EditText>(R.id.etOfficerCurrentPassword).text.toString()
        val new = view.findViewById<EditText>(R.id.etOfficerNewPassword).text.toString()
        val confirm = view.findViewById<EditText>(R.id.etOfficerConfirmPassword).text.toString()

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

        val btn = view.findViewById<Button>(R.id.btnOfficerUpdatePassword)
        val pb = view.findViewById<ProgressBar>(R.id.pbOfficerPasswordUpdate)
        btn.text = ""
        btn.isEnabled = false
        pb.visibility = View.VISIBLE

        val tokenManager = TokenManager(requireContext())
        val api = RetrofitClient.create(tokenManager)

        lifecycleScope.launch {
            try {
                api.changePassword(mapOf("currentPassword" to current, "newPassword" to new))
                Toast.makeText(requireContext(), "Password updated successfully.", Toast.LENGTH_LONG).show()
                view.findViewById<EditText>(R.id.etOfficerCurrentPassword).text.clear()
                view.findViewById<EditText>(R.id.etOfficerNewPassword).text.clear()
                view.findViewById<EditText>(R.id.etOfficerConfirmPassword).text.clear()
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
        val pb = view.findViewById<ProgressBar>(R.id.pbOfficerProfile)
        val tvError = view.findViewById<TextView>(R.id.tvOfficerProfileError)
        val content = view.findViewById<View>(R.id.officerProfileContentContainer)

        pb.visibility = View.VISIBLE
        content.visibility = View.GONE

        val tokenManager = TokenManager(requireContext())
        val api = RetrofitClient.create(tokenManager)

        lifecycleScope.launch {
            try {
                val user = api.getMe()
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

        view.findViewById<TextView>(R.id.tvOfficerInitials).text = initials.ifEmpty { "OF" }
        view.findViewById<TextView>(R.id.tvOfficerFullName).text = fullName.ifEmpty { "N/A" }
        view.findViewById<TextView>(R.id.tvOfficerRoleLabel).text = "Barangay Officer · ${user.role}"
        view.findViewById<TextView>(R.id.tvOfficerEmail).text = user.email
        view.findViewById<TextView>(R.id.tvOfficerUsername).text = user.username
        view.findViewById<TextView>(R.id.tvOfficerStatus).text = user.status.replace("_", " ")
        view.findViewById<TextView>(R.id.tvOfficerFirstName).text = firstName.ifEmpty { "—" }
        view.findViewById<TextView>(R.id.tvOfficerMiddleName).text = middle ?: "—"
        view.findViewById<TextView>(R.id.tvOfficerLastName).text = lastName.ifEmpty { "—" }
        view.findViewById<TextView>(R.id.tvOfficerEmailDetail).text = user.email.ifEmpty { "—" }
    }
}
