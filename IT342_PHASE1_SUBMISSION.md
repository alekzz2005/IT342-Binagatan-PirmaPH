# IT342 Phase 1 – User Registration and Login

**Student Name:** [Your Name]  
**Course:** IT342  
**Project Name:** PirmaPH - Barangay Digital Services Platform  
**Submission Date:** March 6, 2026

---

## 1. GitHub Repository Information

**Repository Link:** https://github.com/alekzz2005/IT342-Binagatan-PirmaPH

**Repository Name Format:** `IT342-Binagatan-PirmaPH`

### Backend Project Configuration

**Maven Configuration:**
- **Group ID:** `edu.cit.binagatan`
- **Artifact ID:** `pirmaph`
- **Base Package:** `edu.cit.binagatan.pirmaph`

**Technology Stack:**
- **Framework:** Spring Boot
- **Version:** 3.5.11
- **Build Tool:** Maven
- **Architecture:** REST API
- **Database:** MySQL 8.0+
- **Security:** Spring Security with JWT Authentication

---

## 2. Final Commit Information

**Commit Message:**
```
IT342 Phase 1 – User Registration and Login Completed
```

**Commit Hash:** [Insert commit hash after final commit]

**Command to create final commit:**
```bash
git add .
git commit -m "IT342 Phase 1 – User Registration and Login Completed"
git push origin main
```

---

## 3. Screenshots

### 3.1 Registration Page
[Screenshot: Registration page with all form fields - to be inserted]

**Description:** Shows the registration form with all required fields including username, email, password, personal information, and address details with Philippine location dropdowns.

---

### 3.2 Successful User Registration
[Screenshot: Success message or automatic redirect to dashboard - to be inserted]

**Description:** Demonstrates successful registration with automatic login and redirect to the dashboard.

---

### 3.3 Login Page
[Screenshot: Login page with email and password fields - to be inserted]

**Description:** Shows the login interface with email and password fields and validation.

---

### 3.4 Successful Login
[Screenshot: Dashboard after successful login - to be inserted]

**Description:** Shows the dashboard displayed after successful authentication, including user information and Philippine flag-themed interface.

---

### 3.5 Database Record
[Screenshot: MySQL query showing registered user in database - to be inserted]

**SQL Query Used:**
```sql
USE pirmaPH_db;
SELECT id, username, email, first_name, last_name, role, created_at FROM user;
```

**Description:** Shows the user record stored in the database with hashed password (BCrypt).

---

## 4. Implementation Summary

### 4.1 User Registration

#### Registration Fields Used

The registration system captures comprehensive user information organized into the following categories:

**Account Credentials:**
- Username (unique, 3-50 characters)
- Email (unique, valid email format)
- Password (minimum 8 characters)
- Confirm Password (must match password)

**Personal Information:**
- First Name (required)
- Middle Name (optional)
- Last Name (required)
- Birth Date (valid date, user must be 18+)
- Sex (Male/Female/Other)
- Phone Number (Philippine format: 11 digits)

**Address Information:**
- Street Address
- Province (dropdown from PSGC API)
- Municipality/City (dropdown, cascades from Province)
- Barangay (dropdown, cascades from Municipality/City)
- ZIP Code (5 digits)

**Role Selection:**
- Resident (default)
- Officer (for barangay officials)

#### Validation Process

**Frontend Validation (Client-Side):**
- Required field validation
- Email format validation using regex pattern
- Password strength checking (minimum 8 characters)
- Password confirmation matching
- Phone number format validation (09XXXXXXXXX)
- ZIP code format validation (5 digits)

**Backend Validation (Server-Side):**
- `@Valid` annotation on DTO for automatic validation
- `@NotBlank` for required string fields
- `@Email` for email format validation
- `@Size` for field length constraints
- `@Pattern` for phone number and ZIP code validation
- Custom business logic validation in `AuthService`

#### Duplicate Account Prevention

**Database Constraints:**
- `username` column has UNIQUE constraint
- `email` column has UNIQUE constraint

**Application-Level Checks:**
```java
if (userRepository.existsByEmail(request.getEmail())) {
    throw new RuntimeException("Email already registered");
}
if (userRepository.existsByUsername(request.getUsername())) {
    throw new RuntimeException("Username already taken");
}
```

The system checks for existing users before attempting to save new registrations, preventing duplicate accounts at both database and application levels.

#### Secure Password Storage

**Hashing Algorithm:** BCrypt with salt (Spring Security BCryptPasswordEncoder)

**Implementation:**
```java
String hashedPassword = passwordEncoder.encode(plainPassword);
```

**Security Features:**
- Each password gets a unique random salt
- Computationally expensive hashing prevents brute-force attacks
- Passwords are NEVER stored in plain text
- One-way hashing ensures passwords cannot be reversed
- BCrypt automatically handles salt generation and verification

**Storage Format:** `$2a$10$[salt][hash]`

---

### 4.2 User Login

#### Login Credentials Used

Users authenticate using:
- **Email Address** (unique identifier)
- **Password** (plain text, validated against stored hash)

**Why email instead of username?**
- Email is guaranteed unique and verified
- More user-friendly (users often forget usernames)
- Industry standard for authentication

#### User Verification Process

**Step 1: User Lookup**
```java
User user = userRepository.findByEmail(email)
    .orElseThrow(() -> new RuntimeException("Invalid credentials"));
```

**Step 2: Password Verification**
```java
if (!passwordEncoder.matches(plainPassword, user.getPasswordHash())) {
    throw new RuntimeException("Invalid credentials");
}
```

**Step 3: JWT Token Generation**
```java
String token = jwtUtil.generateToken(user.getId(), user.getRole());
```

**Security Notes:**
- Generic error messages prevent username enumeration attacks
- BCrypt comparison is timing-attack resistant
- Failed login attempts are logged for security monitoring

#### Post-Login Actions

**1. JWT Token Generation:**
- Creates a signed JWT token containing user ID and role
- Token expiration: 24 hours
- Signing algorithm: HMAC-SHA with configurable secret key

**2. Response to Client:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "juandelacruz",
    "email": "juan@example.com",
    "firstName": "Juan",
    "lastName": "Dela Cruz",
    "role": "RESIDENT"
  }
}
```

**3. Client-Side Storage:**
- JWT token stored in localStorage
- User object stored in localStorage
- Token sent in Authorization header for subsequent requests: `Authorization: Bearer <token>`

**4. Navigation:**
- Frontend automatically redirects to dashboard
- User information displayed in UI
- Protected routes become accessible

---

### 4.3 Database Table Structure

**Database Name:** `pirmaPH_db`

**Table Name:** `user`

**Table Schema:**

| Column Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique user identifier |
| username | VARCHAR(50) | UNIQUE, NOT NULL | User's login username |
| email | VARCHAR(100) | UNIQUE, NOT NULL | User's email address |
| password_hash | VARCHAR(255) | NOT NULL | BCrypt hashed password |
| first_name | VARCHAR(50) | NOT NULL | User's first name |
| middle_name | VARCHAR(50) | NULL | User's middle name (optional) |
| last_name | VARCHAR(50) | NOT NULL | User's last name |
| birth_date | DATE | NOT NULL | User's date of birth |
| sex | VARCHAR(10) | NOT NULL | User's gender |
| phone_number | VARCHAR(15) | NOT NULL | Contact phone number |
| street | VARCHAR(255) | NOT NULL | Street address |
| barangay | VARCHAR(100) | NOT NULL | Barangay name |
| city | VARCHAR(100) | NOT NULL | Municipality/City name |
| province | VARCHAR(100) | NOT NULL | Province name |
| zip_code | VARCHAR(10) | NOT NULL | Postal ZIP code |
| role | ENUM('RESIDENT', 'OFFICER') | DEFAULT 'RESIDENT' | User role |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Registration timestamp |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

**Indexes:**
- Primary Key on `id`
- Unique Index on `email`
- Unique Index on `username`

**Sample Record:**
```sql
id: 550e8400-e29b-41d4-a716-446655440000
username: juandelacruz
email: juan.delacruz@example.com
password_hash: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
first_name: Juan
middle_name: Santos
last_name: Dela Cruz
birth_date: 1990-05-15
sex: Male
phone_number: 09171234567
street: 123 Rizal Street
barangay: Barangay San Pedro
city: Cebu City
province: Cebu
zip_code: 6000
role: RESIDENT
created_at: 2026-03-06 10:30:45
updated_at: 2026-03-06 10:30:45
```

---

### 4.4 API Endpoints

**Base URL:** `http://localhost:8080/api`

#### Endpoint 1: User Registration

**URL:** `POST /api/auth/register`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "juandelacruz",
  "email": "juan.delacruz@example.com",
  "password": "SecurePass123!",
  "firstName": "Juan",
  "middleName": "Santos",
  "lastName": "Dela Cruz",
  "birthDate": "1990-05-15",
  "sex": "Male",
  "phoneNumber": "09171234567",
  "street": "123 Rizal Street",
  "barangay": "Barangay San Pedro",
  "city": "Cebu City",
  "province": "Cebu",
  "zipCode": "6000",
  "role": "RESIDENT"
}
```

**Success Response (201 Created):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "juandelacruz",
    "email": "juan.delacruz@example.com",
    "firstName": "Juan",
    "middleName": "Santos",
    "lastName": "Dela Cruz",
    "birthDate": "1990-05-15",
    "sex": "Male",
    "phoneNumber": "09171234567",
    "street": "123 Rizal Street",
    "barangay": "Barangay San Pedro",
    "city": "Cebu City",
    "province": "Cebu",
    "zipCode": "6000",
    "role": "RESIDENT",
    "createdAt": "2026-03-06T10:30:45",
    "updatedAt": "2026-03-06T10:30:45"
  }
}
```

**Error Response (400 Bad Request - Validation Error):**
```json
{
  "timestamp": "2026-03-06T10:30:45",
  "status": 400,
  "error": "Bad Request",
  "message": "Email is invalid",
  "path": "/api/auth/register"
}
```

**Error Response (409 Conflict - Duplicate Email):**
```json
{
  "timestamp": "2026-03-06T10:30:45",
  "status": 409,
  "error": "Conflict",
  "message": "Email already registered",
  "path": "/api/auth/register"
}
```

---

#### Endpoint 2: User Login

**URL:** `POST /api/auth/login`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "juan.delacruz@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "juandelacruz",
    "email": "juan.delacruz@example.com",
    "firstName": "Juan",
    "middleName": "Santos",
    "lastName": "Dela Cruz",
    "birthDate": "1990-05-15",
    "sex": "Male",
    "phoneNumber": "09171234567",
    "street": "123 Rizal Street",
    "barangay": "Barangay San Pedro",
    "city": "Cebu City",
    "province": "Cebu",
    "zipCode": "6000",
    "role": "RESIDENT",
    "createdAt": "2026-03-06T10:30:45",
    "updatedAt": "2026-03-06T10:30:45"
  }
}
```

**Error Response (401 Unauthorized - Invalid Credentials):**
```json
{
  "timestamp": "2026-03-06T10:30:45",
  "status": 401,
  "error": "Unauthorized",
  "message": "Invalid email or password",
  "path": "/api/auth/login"
}
```

**Error Response (400 Bad Request - Missing Fields):**
```json
{
  "timestamp": "2026-03-06T10:30:45",
  "status": 400,
  "error": "Bad Request",
  "message": "Email is required",
  "path": "/api/auth/login"
}
```

---

## 5. Technical Implementation Details

### 5.1 Security Features

1. **Password Security:**
   - BCrypt hashing with automatic salt generation
   - Minimum 8 character requirement
   - No password storage in plain text
   - Secure comparison preventing timing attacks

2. **JWT Authentication:**
   - Stateless authentication
   - 24-hour token expiration
   - Signed tokens prevent tampering
   - Role-based access control ready

3. **Input Validation:**
   - Frontend validation for user experience
   - Backend validation for security
   - SQL injection prevention via JPA/Hibernate
   - XSS prevention through proper encoding

4. **CORS Configuration:**
   - Configured for frontend origin (localhost:5173)
   - Prevents unauthorized cross-origin requests

### 5.2 Architecture

**Backend Architecture:**
- **Controller Layer:** Handles HTTP requests and responses
- **Service Layer:** Business logic and validation
- **Repository Layer:** Database access via Spring Data JPA
- **Entity Layer:** Database table mappings
- **DTO Layer:** Data transfer objects for request/response
- **Security Layer:** JWT utilities and Spring Security configuration

**Frontend Architecture:**
- **React Components:** Modular UI components
- **Context API:** Global authentication state management
- **Service Layer:** API calls to backend
- **Protected Routes:** Route guards for authenticated pages

### 5.3 Database Design

**ORM:** Hibernate (via Spring Data JPA)

**Key Features:**
- UUID-based primary keys for better distribution
- Automatic timestamp management (@PrePersist, @PreUpdate)
- Enum type for user roles
- Unique constraints on email and username
- Proper indexing for query performance

---

## 6. Testing

### Testing Performed:

1. ✅ User registration with all fields
2. ✅ Duplicate email prevention
3. ✅ Duplicate username prevention
4. ✅ Password hashing verification in database
5. ✅ User login with valid credentials
6. ✅ Login rejection with invalid credentials
7. ✅ JWT token generation and storage
8. ✅ Protected route access control
9. ✅ Form validation (client and server)
10. ✅ Database record creation

### Test Results:
All tests passed successfully. The system correctly handles user registration, login, authentication, and authorization.

---

## 7. Conclusion

Phase 1 of the PirmaPH project has been successfully completed with a fully functional user registration and login system. The implementation follows industry best practices for security, including BCrypt password hashing and JWT-based authentication. The system is ready for Phase 2 development, which will include additional features such as document request management and barangay announcements.

---

**Submitted by:** Alexander Jr B. Binagatan  
**Date:** March 6, 2026  
**Repository:** https://github.com/alekzz2005/IT342-Binagatan-PirmaPH
