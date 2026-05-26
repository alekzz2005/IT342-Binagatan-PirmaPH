package com.pirmaph.mobile.ui.officer.requests

import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.lifecycle.lifecycleScope
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.pirmaph.mobile.R
import com.pirmaph.mobile.data.api.RetrofitClient
import com.pirmaph.mobile.data.local.TokenManager
import com.pirmaph.mobile.data.models.OfficerDocumentRequestResponse
import com.pirmaph.mobile.data.models.UpdateStatusRequest
import kotlinx.coroutines.launch

class OfficerRequestDetailBottomSheet : BottomSheetDialogFragment() {

    private var requestId: String = ""
    private var onActionCompleted: (() -> Unit)? = null

    companion object {
        private const val ARG_REQUEST_ID = "requestId"

        fun newInstance(requestId: String, onActionCompleted: () -> Unit): OfficerRequestDetailBottomSheet {
            val sheet = OfficerRequestDetailBottomSheet()
            sheet.onActionCompleted = onActionCompleted
            val args = Bundle()
            args.putString(ARG_REQUEST_ID, requestId)
            sheet.arguments = args
            return sheet
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setStyle(STYLE_NORMAL, com.google.android.material.R.style.ThemeOverlay_MaterialComponents_BottomSheetDialog)
        requestId = arguments?.getString(ARG_REQUEST_ID) ?: ""
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View = inflater.inflate(R.layout.fragment_officer_request_detail, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        view.findViewById<View>(R.id.btnCloseDetail).setOnClickListener { dismiss() }
        loadDetail(view)
    }

    private fun loadDetail(view: View) {
        val pb = view.findViewById<ProgressBar>(R.id.pbDetailLoading)
        pb.visibility = View.VISIBLE

        val tokenManager = TokenManager(requireContext())
        val api = RetrofitClient.create(tokenManager)

        lifecycleScope.launch {
            try {
                val request = api.getOfficerRequestById(requestId)
                pb.visibility = View.GONE
                bindDetail(view, request)
            } catch (e: Exception) {
                pb.visibility = View.GONE
                Toast.makeText(requireContext(), "Failed to load details: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun bindDetail(view: View, request: OfficerDocumentRequestResponse) {
        val shortId = "REQ-${request.id.take(8).uppercase()}"
        view.findViewById<TextView>(R.id.tvDetailRequestId).text = shortId
        view.findViewById<TextView>(R.id.tvDetailDate).text = request.requestTimestamp?.take(10) ?: "—"
        view.findViewById<TextView>(R.id.tvDetailResidentName).text = request.residentFullName ?: "—"
        view.findViewById<TextView>(R.id.tvDetailResidentEmail).text = request.residentEmail ?: "—"
        view.findViewById<TextView>(R.id.tvDetailBarangay).text = request.barangayCode ?: "—"
        view.findViewById<TextView>(R.id.tvDetailDocumentType).text = formatDocType(request.documentType)
        view.findViewById<TextView>(R.id.tvDetailPurpose).text = request.purpose ?: "—"

        val etRemarks = view.findViewById<EditText>(R.id.etOfficerRemarks)
        etRemarks.setText(request.officerRemarks ?: "")

        // Status badge
        val tvStatus = view.findViewById<TextView>(R.id.tvDetailStatus)
        applyStatusBadge(tvStatus, request.status)

        // Files
        bindFiles(view, request)

        // Action buttons
        setupActions(view, request, etRemarks)
    }

    private fun bindFiles(view: View, request: OfficerDocumentRequestResponse) {
        val container = view.findViewById<LinearLayout>(R.id.llFilesContainer)
        val tvNoFiles = view.findViewById<TextView>(R.id.tvNoFiles)
        val files = request.files?.filter { it.fileType == "SUPPORTING_ATTACHMENT" || it.signedUrl != null }

        if (files.isNullOrEmpty()) {
            tvNoFiles.visibility = View.VISIBLE
            return
        }

        tvNoFiles.visibility = View.GONE
        files.forEach { file ->
            val fileView = LayoutInflater.from(requireContext())
                .inflate(android.R.layout.simple_list_item_2, container, false)

            val text1 = fileView.findViewById<TextView>(android.R.id.text1)
            val text2 = fileView.findViewById<TextView>(android.R.id.text2)

            text1.text = file.originalFileName ?: "Unknown file"
            text1.setTextColor(Color.parseColor("#0A1A3A"))
            text1.textSize = 13f

            text2.text = if (!file.signedUrl.isNullOrBlank()) "Tap to view" else file.fileType ?: ""
            text2.setTextColor(Color.parseColor("#0038A8"))
            text2.textSize = 12f

            if (!file.signedUrl.isNullOrBlank()) {
                fileView.setOnClickListener {
                    try {
                        val intent = android.content.Intent(android.content.Intent.ACTION_VIEW)
                        intent.data = android.net.Uri.parse(file.signedUrl)
                        startActivity(intent)
                    } catch (e: Exception) {
                        Toast.makeText(requireContext(), "Cannot open file", Toast.LENGTH_SHORT).show()
                    }
                }
            }

            container.addView(fileView)
        }
    }

    private fun setupActions(view: View, request: OfficerDocumentRequestResponse, etRemarks: EditText) {
        val tokenManager = TokenManager(requireContext())
        val api = RetrofitClient.create(tokenManager)

        val btnApprove = view.findViewById<Button>(R.id.btnDetailApprove)
        val btnReject = view.findViewById<Button>(R.id.btnDetailReject)
        val btnReady = view.findViewById<Button>(R.id.btnDetailMarkReady)
        val pbApprove = view.findViewById<ProgressBar>(R.id.pbApprove)
        val pbReject = view.findViewById<ProgressBar>(R.id.pbReject)
        val pbReady = view.findViewById<ProgressBar>(R.id.pbMarkReady)
        val actionsRow = view.findViewById<LinearLayout>(R.id.actionsRow)
        val frameReady = view.findViewById<android.widget.FrameLayout>(R.id.frameMarkReady)

        // Save original text as tag for restoration during loading
        btnApprove.tag = btnApprove.text.toString()
        btnReject.tag = btnReject.text.toString()
        btnReady.tag = btnReady.text.toString()

        // Show/hide buttons based on valid status transitions
        when (request.status) {
            "SUBMITTED", "UNDER_REVIEW" -> {
                actionsRow.visibility = View.VISIBLE
                frameReady.visibility = View.GONE
            }
            "APPROVED", "PENDING_PAYMENT" -> {
                actionsRow.visibility = View.GONE
                frameReady.visibility = View.VISIBLE
            }
            "READY_FOR_RELEASE", "DECLINED" -> {
                // Terminal states — no actions available
                actionsRow.visibility = View.GONE
                frameReady.visibility = View.GONE
            }
            else -> {
                actionsRow.visibility = View.VISIBLE
                frameReady.visibility = View.VISIBLE
            }
        }

        btnApprove.setOnClickListener {
            val remarks = etRemarks.text.toString().trim()
            setButtonLoading(btnApprove, pbApprove, true)
            lifecycleScope.launch {
                try {
                    api.updateOfficerRequestStatus(request.id, UpdateStatusRequest("APPROVED", remarks.ifEmpty { null }))
                    Toast.makeText(requireContext(), "Request approved!", Toast.LENGTH_SHORT).show()
                    onActionCompleted?.invoke()
                    dismiss()
                } catch (e: Exception) {
                    Toast.makeText(requireContext(), "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                } finally {
                    setButtonLoading(btnApprove, pbApprove, false)
                }
            }
        }

        btnReject.setOnClickListener {
            val remarks = etRemarks.text.toString().trim()
            if (remarks.isEmpty()) {
                Toast.makeText(requireContext(), "Remarks are required when rejecting.", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            setButtonLoading(btnReject, pbReject, true)
            lifecycleScope.launch {
                try {
                    api.updateOfficerRequestStatus(request.id, UpdateStatusRequest("DECLINED", remarks))
                    Toast.makeText(requireContext(), "Request rejected.", Toast.LENGTH_SHORT).show()
                    onActionCompleted?.invoke()
                    dismiss()
                } catch (e: Exception) {
                    Toast.makeText(requireContext(), "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                } finally {
                    setButtonLoading(btnReject, pbReject, false)
                }
            }
        }

        btnReady.setOnClickListener {
            val remarks = etRemarks.text.toString().trim()
            setButtonLoading(btnReady, pbReady, true)
            lifecycleScope.launch {
                try {
                    api.updateOfficerRequestStatus(request.id, UpdateStatusRequest("READY_FOR_RELEASE", remarks.ifEmpty { null }))
                    Toast.makeText(requireContext(), "Marked as Ready for Release!", Toast.LENGTH_SHORT).show()
                    onActionCompleted?.invoke()
                    dismiss()
                } catch (e: Exception) {
                    Toast.makeText(requireContext(), "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                } finally {
                    setButtonLoading(btnReady, pbReady, false)
                }
            }
        }
    }

    private fun setButtonLoading(button: Button, progressBar: ProgressBar, loading: Boolean) {
        button.isEnabled = !loading
        if (loading) {
            button.tag = button.text.toString().ifEmpty { button.tag as? String ?: "" }
            button.text = ""
        } else {
            button.text = button.tag as? String ?: button.text
        }
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
    }

    private fun applyStatusBadge(tv: TextView, status: String?) {
        when (status) {
            "SUBMITTED", "UNDER_REVIEW" -> {
                tv.text = "Pending"
                tv.setTextColor(Color.parseColor("#A07800"))
                tv.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1AFCD116"))
            }
            "PENDING_PAYMENT" -> {
                tv.text = "Pending Payment"
                tv.setTextColor(Color.parseColor("#7C3AED"))
                tv.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1A8B5CF6"))
            }
            "APPROVED" -> {
                tv.text = "Approved"
                tv.setTextColor(Color.parseColor("#059669"))
                tv.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1A10B981"))
            }
            "READY_FOR_RELEASE" -> {
                tv.text = "For Release"
                tv.setTextColor(Color.parseColor("#7C3AED"))
                tv.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1A8B5CF6"))
            }
            "DECLINED" -> {
                tv.text = "Rejected"
                tv.setTextColor(Color.parseColor("#CE1126"))
                tv.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1ACE1126"))
            }
            else -> {
                tv.text = status ?: "Unknown"
                tv.setTextColor(Color.GRAY)
            }
        }
    }

    private fun formatDocType(type: String?): String {
        if (type.isNullOrBlank()) return "Unknown Document"
        return type.replace("_", " ").split(" ")
            .joinToString(" ") { it.lowercase().replaceFirstChar { c -> c.uppercase() } }
    }
}
