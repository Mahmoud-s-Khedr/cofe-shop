# Module 2 Integration Guide: Profile

## Purpose

This guide covers current-user profile management:

- fetch profile
- update profile
- change password
- delete current account

Shared contract:

- [frontend-integration-shared-contract.md](./frontend-integration-shared-contract.md)

## Flow-by-Flow Implementation

### Load Current Profile

1. Send `GET /api/me` with bearer token.
2. Read the user payload from `data.user`.
3. Render fields directly from backend names where needed, including `contactInfo` and nested `avatar`.

### Update Current Profile

1. Collect only changed fields.
2. If updating avatar:
   - create upload intent with `ownerType=user` and `purpose=avatar`
   - upload binary
   - mark uploaded
   - send returned `file.id` as `avatarFileId`
3. Send `PATCH /api/me`.
4. Re-render the returned `data.user`.

### Change Password

1. Submit `oldPassword` and `newPassword` to `PATCH /api/me/password`.
2. On success, show confirmation.
3. The backend does not rotate tokens automatically here; keep normal session handling.

### Delete Account

1. Confirm destructive intent in UI.
2. Call `DELETE /api/me` with bearer token.
3. Clear local session state on success.

## Endpoint Contract

### `GET /api/me`

Auth: bearer token required

Success:

- `200`
- payload at `data.user`

Important returned fields:

- `id`
- `name`
- `email`
- `phone`
- `status`
- `rate`
- `contactInfo`
- `avatar`

Example success:

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "user": {
      "id": 1,
      "name": "Ahmed Mohamed",
      "email": "user@example.com",
      "phone": "+201012345678",
      "status": "active",
      "rate": "4.50",
      "contactInfo": "+201000000001",
      "avatar": null
    }
  }
}
```

### `PATCH /api/me`

Auth: bearer token required

Allowed fields:

- `name`
- `phone`
- `contactInfo`
- `address`
- `avatarFileId`

Request example:

```json
{
  "name": "Ahmed Ali Updated",
  "phone": "+201001234567",
  "contactInfo": "+201000000111",
  "address": "Cairo, Nasr City",
  "avatarFileId": 7
}
```

Validation:

- `name`: string, 2-150 chars
- `phone`: string, 7-32 chars
- `contactInfo`: string, 1-255 chars
- `address`: string, 1-500 chars (nullable)
- `avatarFileId`: number when provided (nullable)

Behavior notes:

- sending no supported fields returns `400` with `Nothing to update`
- `avatarFileId` must belong to the same authenticated uploader
- avatar file must be:
  - present
  - uploaded
  - `purpose=avatar`
- `avatarFileId` and `contactInfo` are nullable by business intent, but current DTO validation only accepts valid values when those keys are present. To avoid integration issues, only send `null` if backend behavior has been verified in your environment.

Possible errors:

- `400`: invalid payload, nothing to update, avatar file not uploaded, avatar file wrong purpose
- `403`: trying to use another user’s file
- `404`: avatar file not found
- `409`: duplicate phone

### `PATCH /api/me/password`

Auth: bearer token required

Request:

```json
{
  "oldPassword": "OldSecret123",
  "newPassword": "NewSecret456"
}
```

Validation:

- both fields are strings, 8-64 chars
- `newPassword` must contain letters and numbers

Success:

- `200`
- success message envelope

Possible errors:

- `400`: invalid payload or invalid old password
- `401`: missing or invalid bearer token

Important note:

- The current backend implementation returns `400 Invalid old password`, not `401`, when the old password is wrong.

### `DELETE /api/me/avatar`

Auth: bearer token required

Removes the authenticated user's avatar image and clears the avatar reference on their profile.

Success:

- `200`
- returns updated `data.user` with `avatar: null`

Possible errors:

- `401`: missing or invalid bearer token

### `DELETE /api/me`

Auth: bearer token required

Success:

- `200`
- success message envelope

## Frontend Notes

- Prefer updating only changed fields instead of sending the full profile object.
- Keep a dedicated UI branch for duplicate phone conflicts.
- Treat `rate` as a numeric string from backend, not a number.
- Treat `avatar` as nullable.

## Error Handling

- `400`: validation problems, empty patch, wrong old password
- `401`: missing/invalid bearer token
- `403`: file ownership violation when using avatar files
- `404`: avatar file not found
- `409`: duplicate phone

## QA Checklist

- `GET /api/me` returns current profile.
- `PATCH /api/me` updates `name` only.
- `PATCH /api/me` updates `phone` only.
- `PATCH /api/me` updates `name`, `phone`, and `contactInfo` together.
- `PATCH /api/me` rejects duplicate phone with `409`.
- `PATCH /api/me` rejects empty payload with `400`.
- Avatar upload plus `avatarFileId` update succeeds with an uploaded avatar file.
- `PATCH /api/me/password` succeeds with valid old and new password.
- `PATCH /api/me/password` returns `400` for wrong old password.
- `DELETE /api/me` succeeds and frontend clears session state.
