# PirmaPH Authentication API Documentation

## Base URL
```
http://localhost:8080/api/auth
```

## Endpoints

### 1. Register User
**POST** `/api/auth/register`

Creates a new user account with complete profile information.

**Request Body:**
```json
{
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
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "juan123",
  "email": "juan@email.com",
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
  "role": "RESIDENT",
  "createdAt": "2026-03-06T09:46:20.123456",
  "updatedAt": "2026-03-06T09:46:20.123456",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

*400 Bad Request - Passwords don't match:*
```json
{
  "status": 400,
  "message": "Passwords do not match",
  "timestamp": 1709704700000
}
```

*400 Bad Request - Email already exists:*
```json
{
  "status": 400,
  "message": "Email already registered",
  "timestamp": 1709704700000
}
```

*400 Bad Request - Username already exists:*
```json
{
  "status": 400,
  "message": "Username already taken",
  "timestamp": 1709704700000
}
```

*400 Bad Request - Validation errors:*
```json
{
  "email": "Email must be valid",
  "password": "Password must be at least 8 characters",
  "firstName": "First name is required"
}
```

### 2. Login User
**POST** `/api/auth/login`

Authenticates a user and returns their profile with a JWT token.

**Request Body:**
```json
{
  "email": "juan@email.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "juan123",
  "email": "juan@email.com",
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
  "role": "RESIDENT",
  "createdAt": "2026-03-06T09:46:20.123456",
  "updatedAt": "2026-03-06T09:46:20.123456",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

*401 Unauthorized - Invalid credentials:*
```json
{
  "status": 401,
  "message": "Invalid email or password",
  "timestamp": 1709704700000
}
```

*400 Bad Request - Validation errors:*
```json
{
  "email": "Email is required",
  "password": "Password is required"
}
```

## Field Validations

### Registration Fields
| Field | Required | Validation |
|-------|----------|------------|
| username | Yes | 4-50 characters, alphanumeric and underscores only |
| email | Yes | Valid email format, max 100 characters |
| password | Yes | Min 8 characters |
| confirmPassword | Yes | Must match password |
| firstName | Yes | Max 50 characters |
| middleName | No | Max 50 characters |
| lastName | Yes | Max 50 characters |
| birthDate | Yes | Must be in the past |
| sex | Yes | - |
| phoneNumber | Yes | Valid phone format |
| street | Yes | Max 200 characters |
| barangay | Yes | Max 100 characters |
| city | Yes | Max 100 characters |
| province | Yes | Max 100 characters |
| zipCode | No | Max 20 characters |
| role | No | RESIDENT or OFFICER (defaults to RESIDENT) |

## Authentication

After successful login or registration, you'll receive a JWT token. Use this token for all authenticated requests:

```
Authorization: Bearer <your-token-here>
```

The JWT token contains:
- User ID
- User Role
- Expiration time (24 hours from issue)

## User Roles

- **RESIDENT**: Regular barangay resident
- **OFFICER**: Barangay officer with elevated privileges (for future features)

## CORS Configuration

The API allows requests from:
- http://localhost:5173 (Vite default)
- http://localhost:5174
- http://localhost:3000 (React default)

## Database

The application uses MySQL with the database name: `pirmaPH_db`

The database will be created automatically if it doesn't exist when the application starts.

## Notes

1. **Password Security**: Passwords are hashed using BCrypt before storage
2. **JWT Expiration**: Tokens expire after 24 hours
3. **Mobile Compatibility**: All endpoints are designed to work with future mobile apps
4. **Philippine Location API**: Use the PSGC Cloud API for location data:
   - Regions: https://psgc.cloud/api/regions
   - Provinces: https://psgc.cloud/api/provinces
   - Cities: https://psgc.cloud/api/cities
   - Municipalities: https://psgc.cloud/api/municipalities
   - Barangays: https://psgc.cloud/api/barangays
