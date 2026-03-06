# PirmaPH Backend - Setup Guide

## Prerequisites

1. **Java 17** or higher
2. **MySQL 8.0** or higher
3. **Maven** (or use the included Maven Wrapper)

## Database Setup

### Option 1: Automatic (Recommended)
The database `pirmaPH_db` will be created automatically when you first run the application.

### Option 2: Manual Creation
If you prefer to create it manually:

1. Open MySQL Workbench or MySQL command line
2. Run the following SQL:
```sql
CREATE DATABASE pirmaPH_db;
```

### Database Configuration
The default configuration in `application.properties`:
- **Database**: `pirmaPH_db`
- **Username**: `root`
- **Password**: `` (empty)
- **Port**: `3306`

**If your MySQL has a different configuration**, update `src/main/resources/application.properties`:
```properties
spring.datasource.username=your_username
spring.datasource.password=your_password
```

## Running the Application

### Using Maven Wrapper (Recommended)

**Windows:**
```bash
.\mvnw.cmd spring-boot:run
```

**Linux/Mac:**
```bash
./mvnw spring-boot:run
```

### Using Maven
```bash
mvn spring-boot:run
```

The application will start on **http://localhost:8080**

## Verifying the Setup

### 1. Check Application Status
Once started, you should see:
```
Started PirmaphApplication in X.XXX seconds
```

### 2. Test the API
Use the provided `test-api.http` file with VS Code REST Client extension, or use curl:

**Test Registration:**
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "juan123",
    "email": "juan@email.com",
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!",
    "firstName": "Juan",
    "middleName": "Santos",
    "lastName": "Dela Cruz",
    "birthDate": "1990-05-15",
    "sex": "Male",
    "phoneNumber": "+63 912 345 6789",
    "street": "123 Rizal Street, Poblacion",
    "barangay": "Poblacion",
    "city": "Quezon City",
    "province": "Metro Manila",
    "zipCode": "1100",
    "role": "RESIDENT"
  }'
```

**Test Login:**
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@email.com",
    "password": "SecurePass123!"
  }'
```

### 3. Check Database
Connect to MySQL and verify the users table was created:
```sql
USE pirmaPH_db;
SHOW TABLES;
SELECT * FROM users;
```

## Architecture Overview

### Project Structure
```
backend/
├── src/main/java/edu/cit/binagatan/pirmaph/
│   ├── controller/         # REST API controllers
│   │   └── AuthController.java
│   ├── dto/               # Data Transfer Objects
│   │   ├── RegisterRequest.java
│   │   ├── LoginRequest.java
│   │   ├── AuthResponse.java
│   │   └── ErrorResponse.java
│   ├── entity/            # JPA entities
│   │   ├── User.java
│   │   └── UserRole.java
│   ├── repository/        # Database repositories
│   │   └── UserRepository.java
│   ├── security/          # Security configuration
│   │   ├── JwtUtil.java
│   │   ├── JwtAuthenticationFilter.java
│   │   └── SecurityConfig.java
│   ├── service/           # Business logic
│   │   └── AuthService.java
│   └── PirmaphApplication.java
└── src/main/resources/
    └── application.properties
```

### Key Components

1. **User Entity**: Stores all user information including credentials and profile data
2. **JWT Authentication**: Secure token-based authentication (expires in 24 hours)
3. **Password Security**: BCrypt hashing for password storage
4. **Validation**: Jakarta Validation for input validation
5. **CORS**: Configured for web frontend integration

## Security Features

- ✅ Password hashing with BCrypt
- ✅ JWT token authentication
- ✅ Input validation on all endpoints
- ✅ CORS configuration for frontend
- ✅ Stateless session management
- ✅ Role-based user system (RESIDENT/OFFICER)

## API Endpoints

### Public Endpoints (No Authentication Required)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Protected Endpoints (JWT Required)
All other endpoints require JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Web Frontend Integration

The backend is configured to accept requests from:
- http://localhost:5173 (Vite dev server)
- http://localhost:5174
- http://localhost:3000 (React dev server)

To integrate with your web frontend:

1. Call the register or login endpoint
2. Store the returned JWT token (e.g., in localStorage)
3. Include the token in all subsequent API requests:
```javascript
const response = await fetch('http://localhost:8080/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@email.com',
    password: 'password123'
  })
});

const data = await response.json();
// Store token
localStorage.setItem('token', data.token);
// Store user info
localStorage.setItem('user', JSON.stringify(data));
```

## Philippine Location API Integration

For populating location dropdowns in your frontend:

```javascript
// Fetch regions
const regions = await fetch('https://psgc.cloud/api/regions').then(r => r.json());

// Fetch provinces
const provinces = await fetch('https://psgc.cloud/api/provinces').then(r => r.json());

// Fetch cities
const cities = await fetch('https://psgc.cloud/api/cities').then(r => r.json());

// Fetch municipalities
const municipalities = await fetch('https://psgc.cloud/api/municipalities').then(r => r.json());

// Fetch barangays
const barangays = await fetch('https://psgc.cloud/api/barangays').then(r => r.json());
```

## Troubleshooting

### Port 8080 Already in Use
Change the port in `application.properties`:
```properties
server.port=8081
```

### MySQL Connection Refused
1. Ensure MySQL is running
2. Check username/password in `application.properties`
3. Verify MySQL is listening on port 3306

### Compilation Errors
Clean and rebuild:
```bash
.\mvnw.cmd clean install
```

## Next Steps

After implementing user registration and login, consider adding:

1. **User Profile Endpoints**
   - GET /api/users/me - Get current user profile
   - PUT /api/users/me - Update user profile

2. **Logout Functionality**
   - Token blacklisting or refresh token implementation

3. **Password Reset**
   - Forgot password email flow
   - Reset password endpoint

4. **Role-Based Access Control**
   - Protect specific endpoints by role
   - Officer-only features

5. **Document Request System**
   - Barangay clearance request
   - Certificate of residency request
   - Document status tracking

## Support

For more details, see:
- [API Documentation](API_DOCUMENTATION.md)
- [Test API File](test-api.http)
