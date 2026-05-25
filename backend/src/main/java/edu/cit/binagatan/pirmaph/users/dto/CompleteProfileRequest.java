package edu.cit.binagatan.pirmaph.users.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public class CompleteProfileRequest {

    private LocalDate birthDate;
    
    private String sex;
    
    @NotBlank(message = "Phone number is required")
    private String phoneNumber;
    
    @NotBlank(message = "Street is required")
    private String street;
    
    @NotBlank(message = "Barangay is required")
    private String barangay;
    
    @NotBlank(message = "City is required")
    private String city;
    
    @NotBlank(message = "Province is required")
    private String province;

    private String region;
    
    private String zipCode;

    // Location Codes
    private String regionCode;
    private String provinceCode;
    private String cityMunCode;
    private String barangayCode;

    // Getters and Setters
    public LocalDate getBirthDate() { return birthDate; }
    public void setBirthDate(LocalDate birthDate) { this.birthDate = birthDate; }

    public String getSex() { return sex; }
    public void setSex(String sex) { this.sex = sex; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getStreet() { return street; }
    public void setStreet(String street) { this.street = street; }

    public String getBarangay() { return barangay; }
    public void setBarangay(String barangay) { this.barangay = barangay; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getProvince() { return province; }
    public void setProvince(String province) { this.province = province; }

    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }

    public String getZipCode() { return zipCode; }
    public void setZipCode(String zipCode) { this.zipCode = zipCode; }

    public String getRegionCode() { return regionCode; }
    public void setRegionCode(String regionCode) { this.regionCode = regionCode; }

    public String getProvinceCode() { return provinceCode; }
    public void setProvinceCode(String provinceCode) { this.provinceCode = provinceCode; }

    public String getCityMunCode() { return cityMunCode; }
    public void setCityMunCode(String cityMunCode) { this.cityMunCode = cityMunCode; }

    public String getBarangayCode() { return barangayCode; }
    public void setBarangayCode(String barangayCode) { this.barangayCode = barangayCode; }
}
