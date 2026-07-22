# API List

Generated from `openapi.json` (REST) and `src/**/*.gateway.ts` (WebSocket).

## REST APIs

### Admin

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | /admin/admins | bearer | List all admins (admin only) |
| DELETE | /admin/admins/{id} | bearer | Demote an admin to regular user (admin only) |
| POST | /admin/admins/{id} | bearer | Promote a user to admin (admin only) |
| GET | /admin/users | bearer | List all users with optional filters (admin only) |
| DELETE | /admin/users/{id} | bearer | Delete a user (soft-delete, admin only) |
| GET | /admin/users/{id} | bearer | Get user details for moderation page (admin only) |
| GET | /admin/users/{id}/listings | bearer | List user listings for admin view (read-only) |
| PATCH | /admin/users/{id}/status | bearer | Update a user's status (admin only) |
| POST | /admin/warnings | bearer | Issue a warning to a user (admin only) |

#### GET /admin/admins

- Name: `AdminController_listAdmins`
- Auth: `bearer`
- Summary: List all admins (admin only)

**Request**

_No request body._

**Success Response**

- Status: `200` — Array of admin users
- Shape: `AdminAdminsListResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### DELETE /admin/admins/{id}

- Name: `AdminController_demoteAdmin`
- Auth: `bearer`
- Summary: Demote an admin to regular user (admin only)

**Request**

_No request body._

**Success Response**

- Status: `200` — Admin demoted
- Shape: `AdminUserResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 404 | User not found | ErrorResponseDto |

#### POST /admin/admins/{id}

- Name: `AdminController_promoteAdmin`
- Auth: `bearer`
- Summary: Promote a user to admin (admin only)

**Request**

_No request body._

**Success Response**

- Status: `200` — User promoted to admin
- Shape: `AdminUserResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 404 | User not found | ErrorResponseDto |

#### GET /admin/users

- Name: `AdminController_listUsers`
- Auth: `bearer`
- Summary: List all users with optional filters (admin only)

**Request**

_No request body._

**Success Response**

- Status: `200` — Paginated user list
- Shape: `AdminUsersListResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 403 | Admin access required | ErrorResponseDto |

#### DELETE /admin/users/{id}

- Name: `AdminController_deleteUser`
- Auth: `bearer`
- Summary: Delete a user (soft-delete, admin only)

**Request**

_No request body._

**Success Response**

- Status: `200` — User deleted
- Shape: `SuccessResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 404 | User not found | ErrorResponseDto |

#### GET /admin/users/{id}

- Name: `AdminController_getUserDetails`
- Auth: `bearer`
- Summary: Get user details for moderation page (admin only)

**Request**

_No request body._

**Success Response**

- Status: `200` — Detailed user profile
- Shape: `AdminUserDetailsResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 404 | User not found | ErrorResponseDto |

#### GET /admin/users/{id}/listings

- Name: `AdminController_listUserListings`
- Auth: `bearer`
- Summary: List user listings for admin view (read-only)

**Request**

_No request body._

**Success Response**

- Status: `200` — Paginated user listings
- Shape: `AdminUserListingsResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 404 | User not found | ErrorResponseDto |

#### PATCH /admin/users/{id}/status

- Name: `AdminController_updateUserStatus`
- Auth: `bearer`
- Summary: Update a user's status (admin only)

**Request**

- Shape: `UpdateUserStatusDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| status | string | yes | active, paused, banned | banned | New account status for the user |

**Success Response**

- Status: `200` — User status updated
- Shape: `AdminUserResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 404 | User not found | ErrorResponseDto |

#### POST /admin/warnings

- Name: `AdminController_createWarning`
- Auth: `bearer`
- Summary: Issue a warning to a user (admin only)

**Request**

- Shape: `CreateWarningDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| targetUserId | number | yes | - | 42 | ID of the user to warn |
| message | string | yes | - | Your listing violated our terms of service. | Warning message (2–2000 chars) |

**Success Response**

- Status: `201` — Warning created
- Shape: `WarningResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 404 | Target user not found | ErrorResponseDto |

### Auth

| Method | Path | Auth | Summary |
|---|---|---|---|
| POST | /auth/login | public | Login with email and password |
| POST | /auth/logout | bearer | Revoke refresh token and logout |
| POST | /auth/password/request-otp | public | Request a password-reset OTP via email |
| POST | /auth/password/reset | public | Reset password using OTP |
| POST | /auth/refresh | bearer | Refresh access token using a refresh token |
| POST | /auth/register | public | Register with name/email/phone/password and request a verification OTP via email |
| POST | /auth/register/resend-otp | public | Resend registration OTP to an existing pending registration |
| POST | /auth/register/verify | public | Verify OTP and complete registration |

#### POST /auth/login

- Name: `AuthController_login`
- Auth: `public`
- Summary: Login with email and password

**Request**

- Shape: `LoginDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| email | string | yes | - | user@example.com | User email address |
| password | string | yes | - | Secret123 | User password (8–64 chars) |

**Success Response**

- Status: `201` — Returns access + refresh tokens
- Shape: `TokenResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 401 | Invalid credentials | ErrorResponseDto |

#### POST /auth/logout

- Name: `AuthController_logout`
- Auth: `bearer`
- Summary: Revoke refresh token and logout

**Request**

- Shape: `LogoutDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| refreshToken | string | yes | - | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... | The refresh token to revoke |

**Success Response**

- Status: `201` — Logged out successfully
- Shape: `LogoutResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### POST /auth/password/request-otp

- Name: `AuthController_requestPasswordResetOtp`
- Auth: `public`
- Summary: Request a password-reset OTP via email

**Request**

- Shape: `RequestPasswordResetOtpDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| email | string | yes | - | user@example.com | Registered email to receive the reset OTP |

**Success Response**

- Status: `201` — OTP sent (or silently ignored if email not found)
- Shape: `OtpSentResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### POST /auth/password/reset

- Name: `AuthController_resetPassword`
- Auth: `public`
- Summary: Reset password using OTP

**Request**

- Shape: `ResetPasswordDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| email | string | yes | - | user@example.com | Email associated with the account |
| otp | string | yes | - | 000000 | One-time password received via email (4–8 digits) |
| newPassword | string | yes | - | NewSecret123 | New password — must contain letters and numbers (8–64 chars) |
| confirmPassword | string | yes | - | NewSecret123 | Must match newPassword |

**Success Response**

- Status: `201` — Password updated; returns new tokens
- Shape: `TokenResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 400 | Invalid or expired OTP | ErrorResponseDto |

#### POST /auth/refresh

- Name: `AuthController_refresh`
- Auth: `bearer`
- Summary: Refresh access token using a refresh token

**Request**

- Shape: `RefreshTokenDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| refreshToken | string | yes | - | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... | JWT refresh token |

**Success Response**

- Status: `201` — Returns new access + refresh tokens
- Shape: `TokenResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 401 | Invalid refresh token | ErrorResponseDto |

#### POST /auth/register

- Name: `AuthController_requestRegistrationOtp`
- Auth: `public`
- Summary: Register with name/email/phone/password and request a verification OTP via email

**Request**

- Shape: `RequestRegistrationOtpDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| name | string | yes | - | Ahmed Ali | Full name (2–150 chars) |
| ssn | string | yes | - | 12345678 | National ID / SSN (8–32 chars) |
| email | string | yes | - | user@example.com | Email address |
| phone | string | yes | - | +201001234567 | Phone number (7–32 chars) |
| password | string | yes | - | Secret123 | Password — must contain letters and numbers (8–64 chars) |

**Success Response**

- Status: `201` — OTP sent successfully
- Shape: `OtpSentResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 409 | Email, phone, or SSN already exists | ErrorResponseDto |

#### POST /auth/register/resend-otp

- Name: `AuthController_resendRegistrationOtp`
- Auth: `public`
- Summary: Resend registration OTP to an existing pending registration

**Request**

- Shape: `ResendRegistrationOtpDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| email | string | yes | - | user@example.com | Email address |

**Success Response**

- Status: `201` — OTP resent successfully
- Shape: `OtpSentResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 404 | No pending registration found for this email | ErrorResponseDto |

#### POST /auth/register/verify

- Name: `AuthController_verifyRegistrationOtp`
- Auth: `public`
- Summary: Verify OTP and complete registration

**Request**

- Shape: `VerifyRegistrationOtpDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| email | string | yes | - | user@example.com | Email address |
| otp | string | yes | - | 000000 | One-time password sent via email (4–8 digits) |

**Success Response**

- Status: `201` — User registered; returns access + refresh tokens
- Shape: `TokenResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 400 | Invalid or expired OTP | ErrorResponseDto |

### Chat

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | /chat/conversations | bearer | List conversations for the current user |
| POST | /chat/conversations | bearer | Get or create a conversation with another user |
| GET | /chat/conversations/{id} | bearer | Get a single conversation with metadata for the current user |
| GET | /chat/conversations/{id}/messages | bearer | List messages in a conversation (cursor-paginated) |

#### GET /chat/conversations

- Name: `ChatController_listConversations`
- Auth: `bearer`
- Summary: List conversations for the current user

**Request**

_No request body._

**Success Response**

- Status: `200` — Array of conversations with last message preview
- Shape: `ConversationsListResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### POST /chat/conversations

- Name: `ChatController_createConversation`
- Auth: `bearer`
- Summary: Get or create a conversation with another user

**Request**

- Shape: `CreateConversationDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| participantId | number | yes | - | 12 | User ID of the other conversation participant |
| productId | number | no | - | 45 | Optional product ID to attach as context for the conversation |

**Success Response**

- Status: `201` — Conversation created or existing one returned
- Shape: `ConversationResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### GET /chat/conversations/{id}

- Name: `ChatController_getConversation`
- Auth: `bearer`
- Summary: Get a single conversation with metadata for the current user

**Request**

_No request body._

**Success Response**

- Status: `200` — Conversation metadata
- Shape: `ConversationResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 403 | Not a participant of this conversation | ErrorResponseDto |
| 404 | Conversation not found | ErrorResponseDto |

#### GET /chat/conversations/{id}/messages

- Name: `ChatController_listMessages`
- Auth: `bearer`
- Summary: List messages in a conversation (cursor-paginated)

**Request**

_No request body._

**Success Response**

- Status: `200` — Array of messages in descending sent_at order
- Shape: `MessagesListResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 403 | Not a participant of this conversation | ErrorResponseDto |
| 404 | Conversation not found | ErrorResponseDto |

### Files

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | /files/{id} | bearer | Get file metadata and signed download URL |
| PATCH | /files/{id}/mark-uploaded | bearer | Confirm a file has been uploaded to storage |
| POST | /files/upload-intent | bearer | Create a signed upload URL for a file |

#### GET /files/{id}

- Name: `FilesController_getFile`
- Auth: `bearer`
- Summary: Get file metadata and signed download URL

**Request**

_No request body._

**Success Response**

- Status: `200` — File record with signed URL
- Shape: `FileResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 404 | File not found | ErrorResponseDto |

#### PATCH /files/{id}/mark-uploaded

- Name: `FilesController_markUploaded`
- Auth: `bearer`
- Summary: Confirm a file has been uploaded to storage

**Request**

- Shape: `MarkUploadedDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| checksumSha256 | string | no | - | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 | SHA-256 checksum of the uploaded file (hex, 64 chars) for integrity verification |

**Success Response**

- Status: `200` — File marked as uploaded
- Shape: `FileMarkUploadedResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 404 | File not found | ErrorResponseDto |

#### POST /files/upload-intent

- Name: `FilesController_createUploadIntent`
- Auth: `bearer`
- Summary: Create a signed upload URL for a file

**Request**

- Shape: `CreateUploadIntentDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| ownerType | string | yes | user, product, message | product | Entity type that owns this file |
| ownerId | number | no | - | 5 | ID of the owning entity (omit for new entities) |
| purpose | string | yes | avatar, product_image, chat_attachment, document | product_image | Intended use of the file |
| filename | string | yes | - | photo.jpg | Original filename including extension |
| mimeType | string | yes | image/jpeg, image/png, image/webp, image/gif, video/mp4, video/quicktime, video/webm, video/x-msvideo, audio/mpeg, audio/wav, audio/ogg, audio/webm, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/zip | image/jpeg | MIME type of the file |
| fileSizeBytes | number | no | - | 204800 | File size in bytes (max 50 MB) |

**Success Response**

- Status: `201` — Upload intent with signed URL
- Shape: `UploadIntentResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

### Health

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | /api/health/live | public | Liveness probe — always returns 200 |
| GET | /api/health/ready | public | Readiness probe — checks DB connectivity |

#### GET /api/health/live

- Name: `HealthController_live`
- Auth: `public`
- Summary: Liveness probe — always returns 200

**Request**

_No request body._

**Success Response**

- Status: `200` — Service is alive
- Shape: `HealthResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### GET /api/health/ready

- Name: `HealthController_ready`
- Auth: `public`
- Summary: Readiness probe — checks DB connectivity

**Request**

_No request body._

**Success Response**

- Status: `200` — Service is ready
- Shape: `HealthResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 503 | Database unavailable | ErrorResponseDto |

### Kayan API

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | /api/cart | bearer | List cart items |
| POST | /api/cart/checkout | bearer | KayanController_checkoutCart |
| POST | /api/cart/items | bearer | Add cart item |
| DELETE | /api/cart/items/{id} | bearer | KayanController_deleteCartItem |
| PATCH | /api/cart/items/{id} | bearer | KayanController_updateCartItem |
| POST | /api/faults | bearer | KayanController_createFault |
| PATCH | /api/faults/{id} | bearer | KayanController_updateFault |
| POST | /api/faults/{id}/cancel | bearer | KayanController_cancelFault |
| GET | /api/faults/me | bearer | KayanController_listMyFaults |
| POST | /api/followups/{itemType}/{itemId}/chat/conversations | bearer | KayanController_createConversation |
| GET | /api/followups/{itemType}/{itemId}/chat/conversations/{id}/messages | bearer | KayanController_listMessages |
| POST | /api/followups/{itemType}/{itemId}/chat/conversations/{id}/messages | bearer | KayanController_sendMessage |
| GET | /api/followups/{itemType}/{itemId}/steps | bearer | KayanController_listFollowupSteps |
| GET | /api/gallery | public | KayanController_listGallery |
| POST | /api/orders | bearer | Create order |
| GET | /api/orders/{id} | bearer | KayanController_getOrder |
| PATCH | /api/orders/{id}/address | bearer | KayanController_updateOrderAddress |
| POST | /api/orders/{id}/cancel | bearer | KayanController_cancelOrder |
| GET | /api/orders/me | bearer | KayanController_listMyOrders |
| GET | /api/products | public | List public Kayan products |
| GET | /api/products/{id} | public | Get Kayan product by id |
| POST | /api/ratings | bearer | KayanController_createItemRating |
| POST | /api/services | bearer | KayanController_createService |
| PATCH | /api/services/{id} | bearer | KayanController_updateService |
| POST | /api/services/{id}/cancel | bearer | KayanController_cancelService |
| GET | /api/services/me | bearer | KayanController_listMyServices |

#### GET /api/cart

- Name: `KayanController_listCart`
- Auth: `bearer`
- Summary: List cart items

**Request**

_No request body._

**Success Response**

- Status: `200`
- Shape: `KayanCartResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### POST /api/cart/checkout

- Name: `KayanController_checkoutCart`
- Auth: `bearer`
- Summary: KayanController_checkoutCart

**Request**

- Shape: `CheckoutCartDto`
- Type: `object`
- Fields: _No object fields documented._

**Success Response**

- Status: `201`
- Shape: `KayanOrderResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### POST /api/cart/items

- Name: `KayanController_addCartItem`
- Auth: `bearer`
- Summary: Add cart item

**Request**

- Shape: `CreateCartItemDto`
- Type: `object`
- Fields: _No object fields documented._

**Success Response**

- Status: `201`
- Shape: `KayanCartResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### DELETE /api/cart/items/{id}

- Name: `KayanController_deleteCartItem`
- Auth: `bearer`
- Summary: KayanController_deleteCartItem

**Request**

_No request body._

**Success Response**

- Status: `200`
- Shape: `KayanMessageResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### PATCH /api/cart/items/{id}

- Name: `KayanController_updateCartItem`
- Auth: `bearer`
- Summary: KayanController_updateCartItem

**Request**

- Shape: `UpdateCartItemDto`
- Type: `object`
- Fields: _No object fields documented._

**Success Response**

- Status: `200`
  - _No response body._

**Error Responses**

_No documented error responses._

#### POST /api/faults

- Name: `KayanController_createFault`
- Auth: `bearer`
- Summary: KayanController_createFault

**Request**

- Shape: `CreateFaultDto`
- Type: `object`
- Fields: _No object fields documented._

**Success Response**

- Status: `201`
- Shape: `KayanFaultResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### PATCH /api/faults/{id}

- Name: `KayanController_updateFault`
- Auth: `bearer`
- Summary: KayanController_updateFault

**Request**

- Shape: `UpdateFaultDto`
- Type: `object`
- Fields: _No object fields documented._

**Success Response**

- Status: `200`
  - _No response body._

**Error Responses**

_No documented error responses._

#### POST /api/faults/{id}/cancel

- Name: `KayanController_cancelFault`
- Auth: `bearer`
- Summary: KayanController_cancelFault

**Request**

_No request body._

**Success Response**

- Status: `200`
- Shape: `KayanFaultResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### GET /api/faults/me

- Name: `KayanController_listMyFaults`
- Auth: `bearer`
- Summary: KayanController_listMyFaults

**Request**

_No request body._

**Success Response**

- Status: `200`
- Shape: `KayanFaultsResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### POST /api/followups/{itemType}/{itemId}/chat/conversations

- Name: `KayanController_createConversation`
- Auth: `bearer`
- Summary: KayanController_createConversation

**Request**

- Shape: `CreateFollowupConversationBodyDto`
- Type: `object`
- Fields: _No object fields documented._

**Success Response**

- Status: `201`
  - _No response body._

**Error Responses**

_No documented error responses._

#### GET /api/followups/{itemType}/{itemId}/chat/conversations/{id}/messages

- Name: `KayanController_listMessages`
- Auth: `bearer`
- Summary: KayanController_listMessages

**Request**

_No request body._

**Success Response**

- Status: `200`
  - _No response body._

**Error Responses**

_No documented error responses._

#### POST /api/followups/{itemType}/{itemId}/chat/conversations/{id}/messages

- Name: `KayanController_sendMessage`
- Auth: `bearer`
- Summary: KayanController_sendMessage

**Request**

- Shape: `SendFollowupMessageDto`
- Type: `object`
- Fields: _No object fields documented._

**Success Response**

- Status: `201`
  - _No response body._

**Error Responses**

_No documented error responses._

#### GET /api/followups/{itemType}/{itemId}/steps

- Name: `KayanController_listFollowupSteps`
- Auth: `bearer`
- Summary: KayanController_listFollowupSteps

**Request**

_No request body._

**Success Response**

- Status: `200`
  - _No response body._

**Error Responses**

_No documented error responses._

#### GET /api/gallery

- Name: `KayanController_listGallery`
- Auth: `public`
- Summary: KayanController_listGallery

**Request**

_No request body._

**Success Response**

- Status: `200`
- Shape: `GalleryItemsResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### POST /api/orders

- Name: `KayanController_createOrder`
- Auth: `bearer`
- Summary: Create order

**Request**

- Shape: `CreateOrderDto`
- Type: `object`
- Fields: _No object fields documented._

**Success Response**

- Status: `201`
- Shape: `KayanOrderResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### GET /api/orders/{id}

- Name: `KayanController_getOrder`
- Auth: `bearer`
- Summary: KayanController_getOrder

**Request**

_No request body._

**Success Response**

- Status: `200`
- Shape: `KayanOrderResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### PATCH /api/orders/{id}/address

- Name: `KayanController_updateOrderAddress`
- Auth: `bearer`
- Summary: KayanController_updateOrderAddress

**Request**

- Shape: `UpdateOrderAddressDto`
- Type: `object`
- Fields: _No object fields documented._

**Success Response**

- Status: `200`
  - _No response body._

**Error Responses**

_No documented error responses._

#### POST /api/orders/{id}/cancel

- Name: `KayanController_cancelOrder`
- Auth: `bearer`
- Summary: KayanController_cancelOrder

**Request**

_No request body._

**Success Response**

- Status: `200`
- Shape: `KayanOrderResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### GET /api/orders/me

- Name: `KayanController_listMyOrders`
- Auth: `bearer`
- Summary: KayanController_listMyOrders

**Request**

_No request body._

**Success Response**

- Status: `200`
- Shape: `KayanOrdersResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### GET /api/products

- Name: `KayanController_listProducts`
- Auth: `public`
- Summary: List public Kayan products

**Request**

_No request body._

**Success Response**

- Status: `200`
- Shape: `KayanProductsResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### GET /api/products/{id}

- Name: `KayanController_getProduct`
- Auth: `public`
- Summary: Get Kayan product by id

**Request**

_No request body._

**Success Response**

- Status: `200`
- Shape: `KayanProductResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 404 |  | ErrorResponseDto |

#### POST /api/ratings

- Name: `KayanController_createItemRating`
- Auth: `bearer`
- Summary: KayanController_createItemRating

**Request**

- Shape: `CreateItemRatingDto`
- Type: `object`
- Fields: _No object fields documented._

**Success Response**

- Status: `201`
- Shape: `KayanRatingResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### POST /api/services

- Name: `KayanController_createService`
- Auth: `bearer`
- Summary: KayanController_createService

**Request**

- Shape: `CreateServiceOrderDto`
- Type: `object`
- Fields: _No object fields documented._

**Success Response**

- Status: `201`
- Shape: `KayanServiceResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### PATCH /api/services/{id}

- Name: `KayanController_updateService`
- Auth: `bearer`
- Summary: KayanController_updateService

**Request**

- Shape: `UpdateServiceOrderDto`
- Type: `object`
- Fields: _No object fields documented._

**Success Response**

- Status: `200`
  - _No response body._

**Error Responses**

_No documented error responses._

#### POST /api/services/{id}/cancel

- Name: `KayanController_cancelService`
- Auth: `bearer`
- Summary: KayanController_cancelService

**Request**

_No request body._

**Success Response**

- Status: `200`
- Shape: `KayanServiceResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### GET /api/services/me

- Name: `KayanController_listMyServices`
- Auth: `bearer`
- Summary: KayanController_listMyServices

**Request**

_No request body._

**Success Response**

- Status: `200`
- Shape: `KayanServicesResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

### Kayan API Admin

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | /api/admin/faults | bearer | KayanAdminController_listFaults |
| PATCH | /api/admin/faults/{id}/status | bearer | KayanAdminController_updateFaultStatus |
| POST | /api/admin/followups/{itemType}/{itemId}/steps | bearer | KayanAdminController_createStep |
| DELETE | /api/admin/followups/{itemType}/{itemId}/steps/{id} | bearer | KayanAdminController_deleteStep |
| PATCH | /api/admin/followups/{itemType}/{itemId}/steps/{id} | bearer | KayanAdminController_updateStep |
| GET | /api/admin/gallery | bearer | KayanAdminController_listGallery |
| POST | /api/admin/gallery | bearer | KayanAdminController_createGalleryItem |
| DELETE | /api/admin/gallery/{id} | bearer | KayanAdminController_deleteGalleryItem |
| PATCH | /api/admin/gallery/{id} | bearer | KayanAdminController_updateGalleryItem |
| GET | /api/admin/orders | bearer | KayanAdminController_listOrders |
| PATCH | /api/admin/orders/{id}/status | bearer | KayanAdminController_updateOrderStatus |
| POST | /api/admin/products | bearer | KayanAdminController_createProduct |
| DELETE | /api/admin/products/{id} | bearer | KayanAdminController_deleteProduct |
| PATCH | /api/admin/products/{id} | bearer | KayanAdminController_updateProduct |
| GET | /api/admin/services | bearer | KayanAdminController_listServices |
| PATCH | /api/admin/services/{id}/status | bearer | KayanAdminController_updateServiceStatus |

#### GET /api/admin/faults

- Name: `KayanAdminController_listFaults`
- Auth: `bearer`
- Summary: KayanAdminController_listFaults

**Request**

_No request body._

**Success Response**

- Status: `200`
- Shape: `KayanFaultsResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### PATCH /api/admin/faults/{id}/status

- Name: `KayanAdminController_updateFaultStatus`
- Auth: `bearer`
- Summary: KayanAdminController_updateFaultStatus

**Request**

- Shape: `AdminUpdateFaultStatusDto`
- Type: `object`
- Fields: _No object fields documented._

**Success Response**

- Status: `200`
  - _No response body._

**Error Responses**

_No documented error responses._

#### POST /api/admin/followups/{itemType}/{itemId}/steps

- Name: `KayanAdminController_createStep`
- Auth: `bearer`
- Summary: KayanAdminController_createStep

**Request**

- Shape: `CreateFollowupStepBodyDto`
- Type: `object`
- Fields: _No object fields documented._

**Success Response**

- Status: `201`
  - _No response body._

**Error Responses**

_No documented error responses._

#### DELETE /api/admin/followups/{itemType}/{itemId}/steps/{id}

- Name: `KayanAdminController_deleteStep`
- Auth: `bearer`
- Summary: KayanAdminController_deleteStep

**Request**

_No request body._

**Success Response**

- Status: `200`
  - _No response body._

**Error Responses**

_No documented error responses._

#### PATCH /api/admin/followups/{itemType}/{itemId}/steps/{id}

- Name: `KayanAdminController_updateStep`
- Auth: `bearer`
- Summary: KayanAdminController_updateStep

**Request**

- Shape: `UpdateFollowupStepDto`
- Type: `object`
- Fields: _No object fields documented._

**Success Response**

- Status: `200`
  - _No response body._

**Error Responses**

_No documented error responses._

#### GET /api/admin/gallery

- Name: `KayanAdminController_listGallery`
- Auth: `bearer`
- Summary: KayanAdminController_listGallery

**Request**

_No request body._

**Success Response**

- Status: `200`
- Shape: `GalleryItemsResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### POST /api/admin/gallery

- Name: `KayanAdminController_createGalleryItem`
- Auth: `bearer`
- Summary: KayanAdminController_createGalleryItem

**Request**

- Shape: `CreateGalleryItemDto`
- Type: `object`
- Fields: _No object fields documented._

**Success Response**

- Status: `201`
- Shape: `GalleryItemResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### DELETE /api/admin/gallery/{id}

- Name: `KayanAdminController_deleteGalleryItem`
- Auth: `bearer`
- Summary: KayanAdminController_deleteGalleryItem

**Request**

_No request body._

**Success Response**

- Status: `200`
- Shape: `KayanMessageResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### PATCH /api/admin/gallery/{id}

- Name: `KayanAdminController_updateGalleryItem`
- Auth: `bearer`
- Summary: KayanAdminController_updateGalleryItem

**Request**

- Shape: `UpdateGalleryItemDto`
- Type: `object`
- Fields: _No object fields documented._

**Success Response**

- Status: `200`
  - _No response body._

**Error Responses**

_No documented error responses._

#### GET /api/admin/orders

- Name: `KayanAdminController_listOrders`
- Auth: `bearer`
- Summary: KayanAdminController_listOrders

**Request**

_No request body._

**Success Response**

- Status: `200`
- Shape: `KayanOrdersResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### PATCH /api/admin/orders/{id}/status

- Name: `KayanAdminController_updateOrderStatus`
- Auth: `bearer`
- Summary: KayanAdminController_updateOrderStatus

**Request**

- Shape: `AdminUpdateOrderStatusDto`
- Type: `object`
- Fields: _No object fields documented._

**Success Response**

- Status: `200`
  - _No response body._

**Error Responses**

_No documented error responses._

#### POST /api/admin/products

- Name: `KayanAdminController_createProduct`
- Auth: `bearer`
- Summary: KayanAdminController_createProduct

**Request**

- Shape: `AdminCreateProductDto`
- Type: `object`
- Fields: _No object fields documented._

**Success Response**

- Status: `201`
- Shape: `KayanProductResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### DELETE /api/admin/products/{id}

- Name: `KayanAdminController_deleteProduct`
- Auth: `bearer`
- Summary: KayanAdminController_deleteProduct

**Request**

_No request body._

**Success Response**

- Status: `200`
- Shape: `KayanMessageResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### PATCH /api/admin/products/{id}

- Name: `KayanAdminController_updateProduct`
- Auth: `bearer`
- Summary: KayanAdminController_updateProduct

**Request**

- Shape: `AdminUpdateProductDto`
- Type: `object`
- Fields: _No object fields documented._

**Success Response**

- Status: `200`
  - _No response body._

**Error Responses**

_No documented error responses._

#### GET /api/admin/services

- Name: `KayanAdminController_listServices`
- Auth: `bearer`
- Summary: KayanAdminController_listServices

**Request**

_No request body._

**Success Response**

- Status: `200`
- Shape: `KayanServicesResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### PATCH /api/admin/services/{id}/status

- Name: `KayanAdminController_updateServiceStatus`
- Auth: `bearer`
- Summary: KayanAdminController_updateServiceStatus

**Request**

- Shape: `AdminUpdateServiceStatusDto`
- Type: `object`
- Fields: _No object fields documented._

**Success Response**

- Status: `200`
  - _No response body._

**Error Responses**

_No documented error responses._

### Products

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | /my/products | bearer | List the current user's products |
| POST | /products | bearer | Create a new product listing |
| DELETE | /products/{id} | bearer | Soft-delete a product listing |
| GET | /products/{id} | public | Get a product by ID |
| PATCH | /products/{id} | bearer | Update a product listing |
| PATCH | /products/{id}/status | bearer | Update product status (available/sold/archived) |
| GET | /search/products | public | Search / filter public product listings |

#### GET /my/products

- Name: `ProductsController_listMyProducts`
- Auth: `bearer`
- Summary: List the current user's products

**Request**

_No request body._

**Success Response**

- Status: `200` — Paginated list of own products
- Shape: `ProductListResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### POST /products

- Name: `ProductsController_createProduct`
- Auth: `bearer`
- Summary: Create a new product listing

**Request**

- Shape: `CreateProductDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| category | string | yes | realEstate, vehicles, electronics, homeAndDecor, clothingAndFashion, services | electronics | Product category enum key |
| subcategory | string | no | all, apartmentForRent, apartmentForSale, houses, lands, commercialRealEstateForRent, commercialRealEstateForSale, other, carsForSale, carsForRent, sparePartsAndAccessories, motorCycles, bicycles, trucksAndHeavyVehicles, smartphones, tablets, laptopsAndComputers, accessories, speakersAndHeadphones, cameras, smartWatchesAndWearables, monitorsAndTVs, furniture, officeFurniture, kitchenAndDining, beddingAndBath, homeDecor, homeTools, lighting, menClothing, womenClothing, kidsClothing, shoes, menAccessories, womenAccessoriesAndMakeup, jewelryAndWatches, maintenanceAndRepairs, transportationAndMoving, personalServices, carsServices, homeServices, lessonsAndTutoring | smartphones | Product subcategory enum key |
| name | string | yes | - | iPhone 14 Pro Max | Product title (1–255 chars) |
| description | string | yes | - | Excellent condition, barely used. | Product description (1–5000 chars) |
| price | number | yes | - | 1500 | Price in the local currency |
| city | string | yes | - | Cairo | City where the product is located |
| addressText | string | yes | - | 15 Tahrir Square, Downtown | Street / area address text (1–1000 chars) |
| details | object | no | - | {"condition":"used","color":"black","storage":"256GB"} | Additional product details as a JSON object |
| imageFileIds | array<number> | no | - | [1,2,3] | Up to 10 pre-uploaded file IDs for product images |
| isNegotiable | boolean | no | - | true | Whether price is negotiable |
| preferredContactMethod | string | no | phone, chat, both | both | Preferred contact method |

**Success Response**

- Status: `201` — Product created
- Shape: `ProductResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 400 | Invalid category or file references | ErrorResponseDto |

#### DELETE /products/{id}

- Name: `ProductsController_deleteProduct`
- Auth: `bearer`
- Summary: Soft-delete a product listing

**Request**

_No request body._

**Success Response**

- Status: `200` — Product deleted (soft)
- Shape: `ProductDeleteResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 403 | Not the product owner | ErrorResponseDto |
| 404 | Product not found | ErrorResponseDto |

#### GET /products/{id}

- Name: `ProductsController_getProduct`
- Auth: `public`
- Summary: Get a product by ID

**Request**

_No request body._

**Success Response**

- Status: `200` — Product details with images
- Shape: `ProductResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 404 | Product not found | ErrorResponseDto |

#### PATCH /products/{id}

- Name: `ProductsController_updateProduct`
- Auth: `bearer`
- Summary: Update a product listing

**Request**

- Shape: `UpdateProductDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| category | string | no | realEstate, vehicles, electronics, homeAndDecor, clothingAndFashion, services | electronics | Product category enum key |
| subcategory | string | no | all, apartmentForRent, apartmentForSale, houses, lands, commercialRealEstateForRent, commercialRealEstateForSale, other, carsForSale, carsForRent, sparePartsAndAccessories, motorCycles, bicycles, trucksAndHeavyVehicles, smartphones, tablets, laptopsAndComputers, accessories, speakersAndHeadphones, cameras, smartWatchesAndWearables, monitorsAndTVs, furniture, officeFurniture, kitchenAndDining, beddingAndBath, homeDecor, homeTools, lighting, menClothing, womenClothing, kidsClothing, shoes, menAccessories, womenAccessoriesAndMakeup, jewelryAndWatches, maintenanceAndRepairs, transportationAndMoving, personalServices, carsServices, homeServices, lessonsAndTutoring | smartphones | Product subcategory enum key |
| name | string | no | - | iPhone 14 Pro Max | Product title (1–255 chars) |
| description | string | no | - | Excellent condition. | Product description (1–5000 chars) |
| price | number | no | - | 1500 | Price in local currency |
| city | string | no | - | Cairo | City where the product is located |
| addressText | string | no | - | 15 Tahrir Square, Downtown | Street / area address text (1–1000 chars) |
| details | object | no | - | {"condition":"like_new","warrantyMonths":3} | Additional product details as a JSON object |
| imageFileIds | array<number> | no | - | [1,2] | Replaces the full image set with up to 10 file IDs |
| isNegotiable | boolean | no | - | true | Whether price is negotiable |
| preferredContactMethod | string | no | phone, chat, both | both | Preferred contact method |

**Success Response**

- Status: `200` — Product updated
- Shape: `ProductResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 403 | Not the product owner | ErrorResponseDto |
| 404 | Product not found | ErrorResponseDto |

#### PATCH /products/{id}/status

- Name: `ProductsController_updateProductStatus`
- Auth: `bearer`
- Summary: Update product status (available/sold/archived)

**Request**

- Shape: `UpdateProductStatusDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| status | string | yes | available, sold, archived | sold | New product status |

**Success Response**

- Status: `200` — Status updated
- Shape: `ProductStatusResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 403 | Not the product owner | ErrorResponseDto |
| 404 | Product not found | ErrorResponseDto |

#### GET /search/products

- Name: `ProductsController_searchProducts`
- Auth: `public`
- Summary: Search / filter public product listings

**Request**

_No request body._

**Success Response**

- Status: `200` — Paginated search results
- Shape: `ProductListResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

### Ratings

| Method | Path | Auth | Summary |
|---|---|---|---|
| POST | /ratings | bearer | Rate a user (1–5 stars) |
| GET | /ratings/{userId} | public | Get rating summary for a user |

#### POST /ratings

- Name: `RatingsController_rateUser`
- Auth: `bearer`
- Summary: Rate a user (1–5 stars)

**Request**

- Shape: `CreateRatingDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| ratedUserId | number | yes | - | 15 | ID of the user being rated |
| ratingValue | number | yes | - | 4 | Star rating (1–5) |
| comment | string | no | - | Great seller, fast shipping! | Optional review comment (1–2000 chars) |

**Success Response**

- Status: `201` — Rating submitted or updated
- Shape: `RatingResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 400 | Cannot rate yourself | ErrorResponseDto |

#### GET /ratings/{userId}

- Name: `RatingsController_getUserRatingSummary`
- Auth: `public`
- Summary: Get rating summary for a user

**Request**

_No request body._

**Success Response**

- Status: `200` — Average rating and review count
- Shape: `RatingSummaryResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 404 | User not found | ErrorResponseDto |

### Users

| Method | Path | Auth | Summary |
|---|---|---|---|
| DELETE | /me | bearer | Delete current user account (soft-delete) |
| GET | /me | bearer | Get current user profile |
| PATCH | /me | bearer | Update current user profile |
| PATCH | /me/password | bearer | Change current user password |
| GET | /users/{id} | public | Get public profile and active listings for a user |

#### DELETE /me

- Name: `UsersController_deleteMe`
- Auth: `bearer`
- Summary: Delete current user account (soft-delete)

**Request**

_No request body._

**Success Response**

- Status: `200` — Account deleted
- Shape: `SuccessResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### GET /me

- Name: `UsersController_getMe`
- Auth: `bearer`
- Summary: Get current user profile

**Request**

_No request body._

**Success Response**

- Status: `200` — User profile
- Shape: `UserProfileResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

_No documented error responses._

#### PATCH /me

- Name: `UsersController_updateMe`
- Auth: `bearer`
- Summary: Update current user profile

**Request**

- Shape: `UpdateProfileDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| name | string | no | - | Ahmed Ali | Display name (2–150 chars) |
| avatarFileId | object | no | - | 7 | File ID of the uploaded avatar image, or null to remove avatar |
| contactInfo | object | no | - | +201012345678 | Public contact information string (or null to clear) |
| phone | string | no | - | +201001234567 | Phone number (7–32 chars) |

**Success Response**

- Status: `200` — Profile updated
- Shape: `UserProfileResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 400 | Invalid request payload | ErrorResponseDto |
| 409 | Phone already exists | ErrorResponseDto |

#### PATCH /me/password

- Name: `UsersController_changePassword`
- Auth: `bearer`
- Summary: Change current user password

**Request**

- Shape: `ChangePasswordDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| oldPassword | string | yes | - | OldSecret123 | Current password |
| newPassword | string | yes | - | NewSecret456 | New password — must contain letters and numbers (8–64 chars) |

**Success Response**

- Status: `200` — Password changed
- Shape: `SuccessResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 401 | Current password incorrect | ErrorResponseDto |

#### GET /users/{id}

- Name: `PublicUsersController_getPublicProfile`
- Auth: `public`
- Summary: Get public profile and active listings for a user

**Request**

_No request body._

**Success Response**

- Status: `200` — Public profile and products
- Shape: `PublicUserProfileResponseDto`
- Type: `object`

| Field | Type | Required | Enum | Example | Description |
|---|---|---|---|---|---|
| success | boolean | yes | - | true |  |
| statusCode | number | yes | - | 200 |  |
| data | object | yes | - | - |  |

**Error Responses**

| Status | Description | Body |
|---|---|---|
| 404 | User not found | ErrorResponseDto |

## WebSocket APIs

### ChatGateway

| Event | Channel | Auth | Summary |
|---|---|---|---|
| conversation.join | /chat | bearer | Handle conversation.join |
| message.read | /chat | bearer | Handle message.read |
| message.send | /chat | bearer | Handle message.send |

#### Event `conversation.join`

- Handler: `joinConversation`
- Channel: `/chat`
- Auth: `bearer`
- Summary: Handle conversation.join
- Notes: JWT required in Socket auth/header during connection.

**Request Payload**

- Shape: `JoinConversationDto`

**Response Payload / Emitted Events**

- Shape: `conversation.joined`

#### Event `message.read`

- Handler: `markRead`
- Channel: `/chat`
- Auth: `bearer`
- Summary: Handle message.read
- Notes: JWT required in Socket auth/header during connection.

**Request Payload**

- Shape: `MarkMessageReadDto`

**Response Payload / Emitted Events**

- Shape: `message.read`

#### Event `message.send`

- Handler: `sendMessage`
- Channel: `/chat`
- Auth: `bearer`
- Summary: Handle message.send
- Notes: JWT required in Socket auth/header during connection.

**Request Payload**

- Shape: `SendMessageDto`

**Response Payload / Emitted Events**

- Shape: `message.received`
