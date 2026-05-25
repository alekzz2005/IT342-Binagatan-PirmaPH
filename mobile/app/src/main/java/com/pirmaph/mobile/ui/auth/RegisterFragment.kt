package com.pirmaph.mobile.ui.auth

import android.app.DatePickerDialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.viewpager2.widget.ViewPager2
import com.pirmaph.mobile.R
import com.pirmaph.mobile.data.api.PsgcApiService
import com.pirmaph.mobile.data.api.PsgcRetrofitClient
import com.pirmaph.mobile.data.api.RetrofitClient
import com.pirmaph.mobile.data.local.TokenManager
import com.pirmaph.mobile.data.models.LocationItem
import com.pirmaph.mobile.data.models.RegisterRequest
import com.pirmaph.mobile.data.repository.AuthRepository
import kotlinx.coroutines.launch
import java.util.Calendar

class RegisterFragment : Fragment() {

    private lateinit var spinnerRole: Spinner
    private lateinit var etUsername: EditText
    private lateinit var etEmail: EditText
    private lateinit var etPassword: EditText
    private lateinit var etConfirmPassword: EditText
    private lateinit var etFirstName: EditText
    private lateinit var etMiddleName: EditText
    private lateinit var etLastName: EditText
    private lateinit var tvBirthDate: TextView
    private lateinit var spinnerSex: Spinner
    private lateinit var etPhoneNumber: EditText
    private lateinit var etStreet: EditText
    private lateinit var spinnerRegion: Spinner
    private lateinit var spinnerProvince: Spinner
    private lateinit var spinnerCity: Spinner
    private lateinit var spinnerBarangay: Spinner
    private lateinit var etZipCode: EditText
    private lateinit var btnRegister: Button

    private var regions = listOf<LocationItem>()
    private var provinces = listOf<LocationItem>()
    private var cities = listOf<LocationItem>()
    private var barangays = listOf<LocationItem>()

    private var selectedRegion: LocationItem? = null
    private var selectedProvince: LocationItem? = null
    private var selectedCity: LocationItem? = null
    private var selectedBarangay: LocationItem? = null

    private lateinit var psgcApi: PsgcApiService
    private lateinit var authRepository: AuthRepository

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_register, container, false)

        initViews(view)

        val tokenManager = TokenManager(requireContext())
        val apiService = RetrofitClient.create(tokenManager)
        authRepository = AuthRepository(apiService, tokenManager)
        psgcApi = PsgcRetrofitClient.create()

        setupStaticSpinners()
        setupListeners()
        loadRegions()

        return view
    }

    private fun initViews(view: View) {
        spinnerRole = view.findViewById(R.id.spinnerRole)
        etUsername = view.findViewById(R.id.etUsername)
        etEmail = view.findViewById(R.id.etEmail)
        etPassword = view.findViewById(R.id.etPassword)
        etConfirmPassword = view.findViewById(R.id.etConfirmPassword)
        etFirstName = view.findViewById(R.id.etFirstName)
        etMiddleName = view.findViewById(R.id.etMiddleName)
        etLastName = view.findViewById(R.id.etLastName)
        tvBirthDate = view.findViewById(R.id.tvBirthDate)
        spinnerSex = view.findViewById(R.id.spinnerSex)
        etPhoneNumber = view.findViewById(R.id.etPhoneNumber)
        etStreet = view.findViewById(R.id.etStreet)
        spinnerRegion = view.findViewById(R.id.spinnerRegion)
        spinnerProvince = view.findViewById(R.id.spinnerProvince)
        spinnerCity = view.findViewById(R.id.spinnerCity)
        spinnerBarangay = view.findViewById(R.id.spinnerBarangay)
        etZipCode = view.findViewById(R.id.etZipCode)
        btnRegister = view.findViewById(R.id.btnRegister)
    }

    private fun setupStaticSpinners() {
        val roles = listOf("Select Role...", "RESIDENT", "OFFICER")
        val roleAdapter = com.pirmaph.mobile.ui.utils.PirmaSpinnerAdapter(requireContext(), roles)
        spinnerRole.adapter = roleAdapter

        val sexes = listOf("Select Sex...", "Male", "Female", "Other")
        val sexAdapter = com.pirmaph.mobile.ui.utils.PirmaSpinnerAdapter(requireContext(), sexes)
        spinnerSex.adapter = sexAdapter
    }

    private fun setupListeners() {
        tvBirthDate.setOnClickListener {
            showDatePicker()
        }

        spinnerRegion.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                if (position == 0) return
                selectedRegion = regions[position - 1]
                loadProvinces(selectedRegion!!.code)
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }

        spinnerProvince.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                if (position == 0) return
                selectedProvince = provinces[position - 1]
                loadCitiesByProvince(selectedProvince!!.code)
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }

        spinnerCity.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                if (position == 0) return
                selectedCity = cities[position - 1]
                loadBarangays(selectedCity!!.code)
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }

        spinnerBarangay.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                if (position == 0) return
                selectedBarangay = barangays[position - 1]
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }

        btnRegister.setOnClickListener {
            submitRegistration()
        }
    }

    private fun showDatePicker() {
        val c = Calendar.getInstance()
        val year = c.get(Calendar.YEAR)
        val month = c.get(Calendar.MONTH)
        val day = c.get(Calendar.DAY_OF_MONTH)

        val dpd = DatePickerDialog(requireContext(), { _, y, m, d ->
            val formattedDate = String.format("%04d-%02d-%02d", y, m + 1, d)
            tvBirthDate.text = formattedDate
        }, year, month, day)

        dpd.show()
    }

    private fun loadRegions() {
        lifecycleScope.launch {
            try {
                regions = psgcApi.getRegions()
                val names = mutableListOf("Select Region...")
                names.addAll(regions.map { it.name })
                val adapter = com.pirmaph.mobile.ui.utils.PirmaSpinnerAdapter(requireContext(), names)
                spinnerRegion.adapter = adapter
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "Failed to load regions", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun loadProvinces(regionCode: String) {
        selectedProvince = null
        selectedCity = null
        selectedBarangay = null

        lifecycleScope.launch {
            try {
                provinces = psgcApi.getProvincesByRegion(regionCode)
                if (provinces.isNotEmpty()) {
                    val names = mutableListOf("Select Province...")
                    names.addAll(provinces.map { it.name })
                    val provAdapter = com.pirmaph.mobile.ui.utils.PirmaSpinnerAdapter(requireContext(), names)
                    spinnerProvince.adapter = provAdapter
                    
                    val cityAdapter = com.pirmaph.mobile.ui.utils.PirmaSpinnerAdapter(requireContext(), listOf("Select City..."))
                    spinnerCity.adapter = cityAdapter
                } else {
                    val provAdapter = com.pirmaph.mobile.ui.utils.PirmaSpinnerAdapter(requireContext(), listOf("N/A"))
                    spinnerProvince.adapter = provAdapter
                    loadCitiesByRegion(regionCode)
                }
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "Failed to load provinces", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun loadCitiesByProvince(provinceCode: String) {
        lifecycleScope.launch {
            try {
                cities = psgcApi.getCitiesByProvince(provinceCode)
                val names = mutableListOf("Select City...")
                names.addAll(cities.map { it.name })
                val adapter = com.pirmaph.mobile.ui.utils.PirmaSpinnerAdapter(requireContext(), names)
                spinnerCity.adapter = adapter
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "Failed to load cities", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun loadCitiesByRegion(regionCode: String) {
        lifecycleScope.launch {
            try {
                cities = psgcApi.getCitiesByRegion(regionCode)
                val names = mutableListOf("Select City...")
                names.addAll(cities.map { it.name })
                val adapter = com.pirmaph.mobile.ui.utils.PirmaSpinnerAdapter(requireContext(), names)
                spinnerCity.adapter = adapter
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "Failed to load cities", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun loadBarangays(cityCode: String) {
        lifecycleScope.launch {
            try {
                barangays = psgcApi.getBarangaysByCity(cityCode)
                val names = mutableListOf("Select Barangay...")
                names.addAll(barangays.map { it.name })
                val adapter = com.pirmaph.mobile.ui.utils.PirmaSpinnerAdapter(requireContext(), names)
                spinnerBarangay.adapter = adapter
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "Failed to load barangays", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun submitRegistration() {
        val password = etPassword.text.toString()
        val confirm = etConfirmPassword.text.toString()

        if (password != confirm) {
            Toast.makeText(requireContext(), "Passwords do not match", Toast.LENGTH_SHORT).show()
            return
        }

        if (etUsername.text.isEmpty() || etEmail.text.isEmpty() || password.isEmpty() || etFirstName.text.isEmpty() || etLastName.text.isEmpty()) {
            Toast.makeText(requireContext(), "Please fill in all required fields", Toast.LENGTH_SHORT).show()
            return
        }

        if (selectedRegion == null || selectedCity == null || selectedBarangay == null) {
            Toast.makeText(requireContext(), "Please select complete address details", Toast.LENGTH_SHORT).show()
            return
        }

        val sexMap = mapOf(1 to "M", 2 to "F", 3 to "O")
        val selectedSexCode = sexMap[spinnerSex.selectedItemPosition] ?: "M"

        val request = RegisterRequest(
            username = etUsername.text.toString(),
            email = etEmail.text.toString(),
            password = password,
            firstName = etFirstName.text.toString(),
            middleName = etMiddleName.text.toString().takeIf { it.isNotBlank() },
            lastName = etLastName.text.toString(),
            birthDate = tvBirthDate.text.toString(),
            sex = selectedSexCode,
            phoneNumber = etPhoneNumber.text.toString(),
            street = etStreet.text.toString(),
            regionCode = selectedRegion!!.code,
            region = selectedRegion!!.name,
            provinceCode = selectedProvince?.code,
            province = selectedProvince?.name,
            cityMunCode = selectedCity!!.code,
            city = selectedCity!!.name,
            barangayCode = selectedBarangay!!.code,
            barangay = selectedBarangay!!.name,
            zipCode = etZipCode.text.toString(),
            role = spinnerRole.selectedItem.toString()
        )

        lifecycleScope.launch {
            try {
                val response = authRepository.register(request)
                if (!response.token.isNullOrEmpty() || response.id != null) {
                    Toast.makeText(requireContext(), "Registration Successful!", Toast.LENGTH_LONG).show()
                    requireActivity().findViewById<ViewPager2>(R.id.viewPagerAuth).currentItem = 0
                } else {
                    Toast.makeText(requireContext(), "Registration failed", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
