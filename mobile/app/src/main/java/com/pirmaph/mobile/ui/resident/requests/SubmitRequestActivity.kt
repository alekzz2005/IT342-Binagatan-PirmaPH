package com.pirmaph.mobile.ui.resident.requests

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.lifecycleScope
import com.pirmaph.mobile.R
import com.pirmaph.mobile.data.api.RetrofitClient
import com.pirmaph.mobile.data.local.TokenManager
import com.pirmaph.mobile.data.models.SubmitRequestPayload
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream

class SubmitRequestActivity : AppCompatActivity() {

    private lateinit var spinnerDocumentType: Spinner
    private lateinit var spinnerPurpose: Spinner
    private lateinit var spinnerCopies: Spinner
    private lateinit var etAdditionalDetails: EditText
    private lateinit var tvSelectedFile: TextView
    private lateinit var btnSubmit: Button
    private lateinit var pbLoading: ProgressBar

    private var selectedFileUri: Uri? = null

    companion object {
        fun start(context: Context) {
            val intent = Intent(context, SubmitRequestActivity::class.java)
            context.startActivity(intent)
        }
    }

    private val getContent = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri != null) {
            selectedFileUri = uri
            tvSelectedFile.text = getFileName(uri) ?: "Image selected"
            tvSelectedFile.setTextColor(resources.getColor(R.color.pirma_text_dark, null))
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_submit_request)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.headerLayout)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(v.paddingLeft, systemBars.top + 44, v.paddingRight, v.paddingBottom)
            insets
        }

        spinnerDocumentType = findViewById(R.id.spinnerDocumentType)
        spinnerPurpose = findViewById(R.id.spinnerPurpose)
        spinnerCopies = findViewById(R.id.spinnerCopies)
        etAdditionalDetails = findViewById(R.id.etAdditionalDetails)
        tvSelectedFile = findViewById(R.id.tvSelectedFile)
        btnSubmit = findViewById(R.id.btnSubmit)
        pbLoading = findViewById(R.id.pbLoading)

        setupHeader()
        setupSpinners()

        findViewById<View>(R.id.btnUploadId).setOnClickListener {
            getContent.launch("image/*")
        }

        btnSubmit.setOnClickListener {
            submitRequest()
        }
    }

    private fun setupHeader() {
        findViewById<ImageView>(R.id.btnBack).setOnClickListener {
            finish()
        }
    }

    private fun setupSpinners() {
        val documentTypes = listOf(
            "" to "Select Document Type...",
            "BARANGAY_CLEARANCE" to "Barangay Clearance",
            "CERTIFICATE_OF_RESIDENCY" to "Certificate of Residency",
            "CERTIFICATE_OF_INDIGENCY" to "Certificate of Indigency",
            "BUSINESS_CLEARANCE" to "Business Clearance",
            "CERTIFICATE_OF_GOOD_MORAL" to "Good Moral Certificate",
            "BARANGAY_ID" to "Barangay ID"
        )

        val docAdapter = com.pirmaph.mobile.ui.utils.PirmaSpinnerAdapter(this, documentTypes.map { it.second })
        spinnerDocumentType.adapter = docAdapter
        
        // Save the map to use the keys when submitting
        spinnerDocumentType.tag = documentTypes.map { it.first }

        val purposes = listOf("Select Purpose...", "Employment", "School Requirement", "Bank Application", "Business Use", "Identification", "Other")
        val purposeAdapter = com.pirmaph.mobile.ui.utils.PirmaSpinnerAdapter(this, purposes)
        spinnerPurpose.adapter = purposeAdapter

        val copies = listOf("Select Copies...", "1", "2", "3", "4", "5")
        val copiesAdapter = com.pirmaph.mobile.ui.utils.PirmaSpinnerAdapter(this, copies)
        spinnerCopies.adapter = copiesAdapter
    }

    private fun setLoading(isLoading: Boolean) {
        if (isLoading) {
            btnSubmit.text = ""
            btnSubmit.isEnabled = false
            pbLoading.visibility = View.VISIBLE
        } else {
            btnSubmit.text = "Submit Request"
            btnSubmit.isEnabled = true
            pbLoading.visibility = View.GONE
        }
    }

    private fun submitRequest() {
        if (selectedFileUri == null) {
            Toast.makeText(this, "Please upload a Valid ID", Toast.LENGTH_SHORT).show()
            return
        }

        if (spinnerDocumentType.selectedItemPosition == 0 || spinnerPurpose.selectedItemPosition == 0 || spinnerCopies.selectedItemPosition == 0) {
            Toast.makeText(this, "Please fill in all dropdown fields", Toast.LENGTH_SHORT).show()
            return
        }

        setLoading(true)

        val docKeys = spinnerDocumentType.tag as List<String>
        val docType = docKeys[spinnerDocumentType.selectedItemPosition]
        val purpose = spinnerPurpose.selectedItem.toString()
        val copies = spinnerCopies.selectedItem.toString().toInt()
        val details = etAdditionalDetails.text.toString().takeIf { it.isNotBlank() }

        val payload = SubmitRequestPayload(
            documentType = docType,
            purpose = purpose,
            copies = copies,
            additionalDetails = details
        )

        val tokenManager = TokenManager(this)
        val apiService = RetrofitClient.create(tokenManager)

        lifecycleScope.launch {
            try {
                // 1. Submit form data
                val response = apiService.submitDocumentRequest(payload)
                
                // 2. Upload file
                val file = getFileFromUri(selectedFileUri!!)
                if (file != null) {
                    val requestFile = file.asRequestBody("image/*".toMediaTypeOrNull())
                    val body = MultipartBody.Part.createFormData("file", file.name, requestFile)
                    apiService.uploadRequestAttachment(response.id, body)
                }

                Toast.makeText(this@SubmitRequestActivity, "Request submitted successfully", Toast.LENGTH_LONG).show()
                finish()
            } catch (e: Exception) {
                Toast.makeText(this@SubmitRequestActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                setLoading(false)
            }
        }
    }

    private fun getFileName(uri: Uri): String? {
        var result: String? = null
        if (uri.scheme == "content") {
            val cursor = contentResolver.query(uri, null, null, null, null)
            try {
                if (cursor != null && cursor.moveToFirst()) {
                    val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (index != -1) {
                        result = cursor.getString(index)
                    }
                }
            } finally {
                cursor?.close()
            }
        }
        if (result == null) {
            result = uri.path
            val cut = result?.lastIndexOf('/')
            if (cut != null && cut != -1) {
                result = result?.substring(cut + 1)
            }
        }
        return result
    }

    private fun getFileFromUri(uri: Uri): File? {
        return try {
            val inputStream: InputStream? = contentResolver.openInputStream(uri)
            val fileName = getFileName(uri) ?: "upload.jpg"
            val file = File(cacheDir, fileName)
            val outputStream = FileOutputStream(file)
            inputStream?.copyTo(outputStream)
            inputStream?.close()
            outputStream.close()
            file
        } catch (e: Exception) {
            null
        }
    }
}
