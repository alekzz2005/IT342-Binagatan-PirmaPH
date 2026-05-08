package edu.cit.binagatan.pirmaph.dto;

import jakarta.validation.constraints.*;

public class CreateBarangayAdminRequest {

    @Size(max = 50)
    @Pattern(regexp = "^[a-zA-Z0-9_]*$", message = "Username can only contain letters, numbers, and underscores")
    private String username;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank(message = "Temporary password is required")
    @Size(min = 8, message = "Temporary password must be at least 8 characters")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z0-9]).{8,}$",
        message = "Temporary password must include upper and lower case letters, a number, and a special character"
    )
    private String temporaryPassword;

    @NotBlank(message = "First name is required")
    private String firstName;

    @Size(max = 50, message = "Middle name must not exceed 50 characters")
    private String middleName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^\\+?[0-9\\s-()]+$", message = "Phone number format is invalid")
    private String phoneNumber;

    @NotBlank(message = "Region code is required")
    private String regionCode;

    private String provinceCode;

    @NotBlank(message = "City/Municipality code is required")
    private String cityMunCode;

    @NotBlank(message = "Barangay code is required")
    private String barangayCode;

    @NotBlank(message = "Barangay name is required")
    private String barangay;

    @NotBlank(message = "City is required")
    private String city;

    @Size(max = 100, message = "Province must not exceed 100 characters")
    private String province;

    @NotBlank(message = "Region is required")
    private String region;

    @Size(max = 20, message = "ZIP code must not exceed 20 characters")
    private String zipCode;

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getTemporaryPassword() {
        return temporaryPassword;
    }

    public void setTemporaryPassword(String temporaryPassword) {
        this.temporaryPassword = temporaryPassword;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getMiddleName() {
        return middleName;
    }

    public void setMiddleName(String middleName) {
        this.middleName = middleName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getRegionCode() {
        return regionCode;
    }

    public void setRegionCode(String regionCode) {
        this.regionCode = regionCode;
    }

    public String getProvinceCode() {
        return provinceCode;
    }

    public void setProvinceCode(String provinceCode) {
        this.provinceCode = provinceCode;
    }

    public String getCityMunCode() {
        return cityMunCode;
    }

    public void setCityMunCode(String cityMunCode) {
        this.cityMunCode = cityMunCode;
    }

    public String getBarangayCode() {
        return barangayCode;
    }

    public void setBarangayCode(String barangayCode) {
        this.barangayCode = barangayCode;
    }

    public String getBarangay() {
        return barangay;
    }

    public void setBarangay(String barangay) {
        this.barangay = barangay;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getProvince() {
        return province;
    }

    public void setProvince(String province) {
        this.province = province;
    }

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region;
    }

    public String getZipCode() {
        return zipCode;
    }

    public void setZipCode(String zipCode) {
        this.zipCode = zipCode;
    }
}