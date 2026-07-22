# Frontend Integration Shared Contract

## Purpose

This document defines the shared backend contract that applies across the frontend integration guides in this folder.

Use it together with:

- [module-1-auth-integration.md](./module-1-auth-integration.md)
- [module-2-profile-integration.md](./module-2-profile-integration.md)
- [module-3-products-integration.md](./module-3-products-integration.md)
- [module-4-faults-integration.md](./module-4-faults-integration.md)
- [module-5-services-integration.md](./module-5-services-integration.md)
- [module-6-followup-integration.md](./module-6-followup-integration.md)
- [module-7-gallery-integration.md](./module-7-gallery-integration.md)
- [module-8-ratings-integration.md](./module-8-ratings-integration.md)
- [module-9-admin-integration.md](./module-9-admin-integration.md)

## Base URL and Environment

- Canonical REST prefix: `/api`
- Direct host-run base URL: `http://localhost:3000`
- Docker/Nginx base URL: `http://localhost:800`
- Canonical local API example: `http://localhost:3000/api/auth/login`
- Swagger UI: `http://localhost:800/api/docs`
- OpenAPI JSON: `http://localhost:800/api/docs-json`
- Health endpoints:
  - `GET /api/health/live`
  - `GET /api/health/ready`

Frontend-relevant environment notes:

- `OTP_DEV_MODE=true` may expose the OTP code in auth responses for non-production testing.
- `OTP_DEV_MODE=false` must be assumed in production.
- Socket.io chat namespace is `/chat` and is not represented in Swagger.

## Authentication Contract

Bearer-authenticated HTTP requests must send:

```http
Authorization: Bearer <accessToken>
```

Token lifecycle rules:

- Login, registration verify, password reset, and refresh return `data.accessToken` and `data.refreshToken`.
- `POST /api/auth/refresh` requires the refresh token in the JSON body.
- `POST /api/auth/logout` requires:
  - a valid bearer access token
  - the refresh token in the JSON body
- Recommended frontend retry flow:
  1. request fails because access token is expired or invalid
  2. call `POST /api/auth/refresh`
  3. replace stored token pair
  4. retry the original request once
  5. if refresh fails, clear session and force re-login

## HTTP Response Envelope

Successful responses use a standard envelope:

```json
{
  "success": true,
  "statusCode": 200,
  "data": {}
}
```

Important behavior:

- `data` holds the actual payload.
- Many success payloads duplicate the main nested object at top level because of the response envelope interceptor. Frontend code should read the documented nested key, for example `data.user`, `data.order`, `data.items`, `data.message`.
- The backend uses camelCase in request bodies, but many response fields are snake_case.

Example success payload:

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "order": {
      "id": 41,
      "delivery_address": "Cairo, Nasr City",
      "status": "received"
    },
    "id": 41,
    "delivery_address": "Cairo, Nasr City",
    "status": "received"
  }
}
```

## Error Response Envelope

Errors use a shared structure:

```json
{
  "success": false,
  "statusCode": 400,
  "data": null,
  "error": {
    "code": 400,
    "message": "Invalid payload",
    "timestamp": "2026-03-28T12:00:00.000Z",
    "path": "/api/example"
  }
}
```

Frontend should treat `error.message` as the primary display/debug message.

Common status handling:

- `400`: validation failure, invalid state, invalid enum, malformed request
- `401`: missing or invalid auth, invalid credentials, invalid refresh token
- `403`: authenticated but not allowed
- `404`: entity not found
- `409`: uniqueness conflict

## Validation Behavior

Global validation is enforced by NestJS `ValidationPipe` with:

- `transform: true`
- `whitelist: true`
- `forbidNonWhitelisted: true`

Frontend implications:

- Query params like numeric IDs and numbers are implicitly converted when valid.
- Unknown request-body fields are rejected instead of ignored.
- Enum values and min/max or length constraints are enforced strictly.

## Naming and Field Conventions

Request conventions:

- JSON request bodies are camelCase.
- Route params and query params use the names shown in Swagger and the guides.

Response conventions:

- Kayan module payloads often use snake_case:
  - `delivery_address`
  - `created_at`
  - `updated_at`
  - `user_id`
  - `item_count`
  - `service_type`
- Asset payloads use:
  - `file_id`
  - `sort_order`
  - `object_key`
  - `original_filename`
  - `mime_type`
  - `status`

Frontend should not auto-convert backend field names unless the application has a consistent mapping layer.

## Pagination Contract

Offset-style collection endpoints accept:

- `page`: optional, minimum `1`, default `1`
- `limit`: optional, endpoint-specific max, default usually `20`
- `offset`: optional, minimum `0`, default `0`

Behavior:

- If `offset` is present, it takes precedence.
- If `offset` is omitted, the backend computes it as `(page - 1) * limit`.
- `GET /api/chat/conversations/:id/messages` is the exception and remains cursor-paginated with `limit` + `before`.

## File Upload Lifecycle

Used by profile avatar, faults, gallery, and any future asset-linked flows.

Canonical sequence:

1. `POST /api/files/upload-intent`
2. Upload the binary to the returned signed target
3. `PATCH /api/files/:id/mark-uploaded`
4. Use the returned `file.id` in later business requests
5. Optionally `GET /api/files/:id` for metadata and `readUrl`

Upload intent request shape:

```json
{
  "ownerType": "product",
  "purpose": "product_image",
  "filename": "example.jpg",
  "mimeType": "image/jpeg",
  "fileSizeBytes": 204800
}
```

Supported enums:

- `ownerType`: `user`, `product`, `message`
- `purpose`: `avatar`, `product_image`, `chat_attachment`, `document`

Ownership and usage rules:

- The upload intent is tied to the authenticated uploader.
- `PATCH /api/files/:id/mark-uploaded` is only allowed for the uploader.
- `GET /api/files/:id` is only allowed for the uploader or an admin.
- Some business flows impose additional file-purpose rules:
  - profile avatar requires an uploaded `avatar` file
  - faults currently require uploaded image files whose purpose is `product_image`

Example mark-uploaded request:

```json
{
  "checksumSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

## WebSocket Notes for Module 6

Socket.io namespace:

- `/chat`

Token placement:

- preferred: `handshake.auth.token = "Bearer <accessToken>"`
- also accepted: `Authorization` header with `Bearer <accessToken>`

Server events and ack payloads are documented in [module-6-followup-integration.md](./module-6-followup-integration.md).
