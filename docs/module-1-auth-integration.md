# Module 1 Integration Guide: Authentication and Registration

## Purpose

This guide covers all frontend work for:

- registration
- OTP verification and resend
- login
- password reset
- refresh and logout

Read the shared contract first:

- [frontend-integration-shared-contract.md](./frontend-integration-shared-contract.md)

## Flow-by-Flow Implementation

### Registration

1. Submit `name`, `email`, `phone`, `password` (and optional `address`) to `POST /api/auth/register`.
2. Backend creates or updates a pending registration and sends an OTP.
3. If `OTP_DEV_MODE=true`, the response may include `data.otp`.
4. Show the OTP verification screen.
5. Submit `email` and `otp` to `POST /api/auth/register/verify`.
6. Store `data.accessToken` and `data.refreshToken`.

Optional resend flow:

- Call `POST /api/auth/register/resend-otp` with the same `email`.

### Login

1. Submit `email` and `password` to `POST /api/auth/login`.
2. On `201`, store `data.accessToken` and `data.refreshToken`.
3. Use the access token for all protected API calls.

### Forgot Password

1. Submit `email` to `POST /api/auth/password/request-otp`.
2. Always show a neutral “check your email” confirmation, even if the email is unknown.
3. Submit `email`, `otp`, `newPassword`, and `confirmPassword` to `POST /api/auth/password/reset`.
4. On success, replace the current token pair with the returned token pair.

### Refresh and Logout

- Refresh: `POST /api/auth/refresh` with JSON body `{ "refreshToken": "..." }`
- Logout: `POST /api/auth/logout` with:
  - bearer access token
  - JSON body `{ "refreshToken": "..." }`

## Endpoint Contract

### `POST /api/auth/register`

Purpose: start registration and send OTP.

Request body:

```json
{
  "name": "Ahmed Ali",
  "email": "user@example.com",
  "phone": "+201001234567",
  "password": "Secret123",
  "address": "123 Main St, Cairo"
}
```

`address` is optional.

Validation:

- `name`: string, 2-150 chars
- `email`: valid email
- `phone`: string, 7-32 chars
- `password`: string, 8-64 chars, must contain letters and numbers
- `address`: optional string, 1-500 chars

Success:

- `201`
- response data contains `message`
- response may also contain `otp` only when `OTP_DEV_MODE=true`

Possible errors:

- `409`: email or phone already exists
- `400`: invalid payload or unknown fields

Example success:

```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "message": "OTP sent",
    "otp": "000000"
  }
}
```

### `POST /api/auth/register/resend-otp`

Request body:

```json
{
  "email": "user@example.com"
}
```

Success:

- `201`
- same OTP response shape as register

Possible errors:

- `400`: no pending registration found or payload invalid

### `POST /api/auth/register/verify`

Request body:

```json
{
  "email": "user@example.com",
  "otp": "000000"
}
```

Validation:

- `email`: valid email
- `otp`: string, 4-8 chars

Success:

- `201`
- token response in `data.accessToken` and `data.refreshToken`
- `data.user` currently contains basic auth user info only

Example success:

```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com"
    },
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token"
  }
}
```

Possible errors:

- `400`: invalid OTP, expired OTP, or expired registration session
- `409`: uniqueness conflict discovered during user creation

### `POST /api/auth/login`

Request body:

```json
{
  "email": "user@example.com",
  "password": "Secret123"
}
```

Validation:

- `email`: valid email
- `password`: string, 8-64 chars

Success:

- `201`
- returns `data.user`, `data.accessToken`, `data.refreshToken`

Possible errors:

- `401`: invalid credentials
- inactive, paused, banned, or deleted users should be treated as generic invalid credentials

### `POST /api/auth/password/request-otp`

Request body:

```json
{
  "email": "user@example.com"
}
```

Success:

- `201`
- always return success-style confirmation
- frontend must not assume the email exists
- may include `otp` in dev mode

### `POST /api/auth/password/reset`

Request body:

```json
{
  "email": "user@example.com",
  "otp": "000000",
  "newPassword": "NewSecret123",
  "confirmPassword": "NewSecret123"
}
```

Validation:

- `otp`: string, 4-8 chars
- `newPassword`: string, 8-64 chars, letters and numbers required
- `confirmPassword`: string, 8-64 chars, must match `newPassword`

Success:

- `201`
- returns a fresh token pair in the same token-response shape used by login

Possible errors:

- `400`: invalid OTP, expired OTP, password mismatch, invalid payload, user not found
- `401`: inactive/non-active user path can currently fail as invalid credentials

### `POST /api/auth/refresh`

Request body:

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

Success:

- `201`
- returns new `data.accessToken` and `data.refreshToken`

Possible errors:

- `401`: invalid refresh token

### `POST /api/auth/logout`

Auth: bearer token required

Request body:

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

Success:

- `201`
- `data` is an empty object

Possible errors:

- `401`: missing or invalid access token

## Frontend Notes

- Registration and password-reset OTPs are email-based.
- OTP value should only be shown in development or automated QA when the backend returns `data.otp`.
- Treat all auth tokens as secrets; never log them.
- The repo test harnesses use email-based login only. Frontend should also integrate login with `email`.

## Error Handling

- `400`: inline field error, invalid OTP, password mismatch, bad request body
- `401`: invalid login, invalid refresh token, or missing bearer token on logout
- `409`: duplicate registration identity

## QA Checklist

- Register a new user and verify using returned dev OTP when available.
- Resend registration OTP and verify with the resent code.
- Login with a valid user.
- Request password reset OTP and complete reset with matching passwords.
- Confirm old password no longer works after reset.
- Refresh the token pair and retry a protected request.
- Logout and confirm later refresh fails.
- Validate duplicate registration returns `409`.
