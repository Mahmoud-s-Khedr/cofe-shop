# Module 9 Integration Guide: Admin User Management and Public Profiles

## Purpose

This guide covers all admin-side user management operations and the public user profile endpoint:

- listing users with filters
- viewing user details and their listings
- browsing Kayan reviews for moderation
- updating user account status
- soft-deleting users
- admin role management (promote/demote)
- issuing warnings
- public user profile (`GET /api/users/:id`)

Shared contract:

- [frontend-integration-shared-contract.md](./frontend-integration-shared-contract.md)

> [!IMPORTANT]
> All `/admin/*` routes in this guide require an **admin bearer token**. Regular authenticated users receive `403 Forbidden`.

## Flow-by-Flow Implementation

### List and Search Users

1. Call `GET /api/admin/users` with optional `q`, `status`, `page`, `limit`, and `offset` params.
2. Render the returned `data.items[]`.

### View User Details

1. Call `GET /api/admin/users/:id`.
2. Render the detailed profile including contact info, status, and account flags.

### View User Listings

1. Call `GET /api/admin/users/:id/listings` to see products/listings created by the user.
2. Apply optional `status` and pagination filters.

### Browse Kayan Reviews

Admin review browsing endpoints:

- `GET /api/admin/ratings/items/:itemId?itemType=product|fault|service`
- `GET /api/admin/ratings/users/:userId`
- `GET /api/admin/ratings`

These routes expose only the current Kayan item-review system. Legacy user-to-user ratings are not included.

### Update User Status

1. Call `PATCH /api/admin/users/:id/status` with the new status.
2. Valid statuses: `active`, `paused`, `banned`.
3. On success, re-render the user's updated record.

### Soft-Delete a User

1. Confirm destructive intent in the admin UI.
2. Call `DELETE /api/admin/users/:id`.
3. The record is soft-deleted; the user can no longer authenticate.

### Issue a Warning

1. Collect target user ID and a warning message.
2. Call `POST /api/admin/warnings`.
3. On success, the warning is recorded against the target user.

### Admin Role Management

To promote a regular user to admin:

- `POST /api/admin/admins/:id`

To demote an admin back to a regular user:

- `DELETE /api/admin/admins/:id`

To list current admins:

- `GET /api/admin/admins`

### View Public User Profile

Any user (or unauthenticated visitor) can view a public profile:

- `GET /api/users/:id`

Returns the user's public info and their active product listings.

---

## Endpoint Contract

### `GET /api/admin/users`

Auth: admin bearer token required

Supported query params:

- `q`: string, 1-100 chars — search by name or phone
- `status`: `active`, `paused`, `banned`
- `page`: integer, min `1`, default `1`
- `limit`: integer, 1-100 (default `20`)
- `offset`: integer, 0-10000 (default `0`)

> [!NOTE]
> Admin users list accepts both `page` and `offset`. If both are sent, `offset` takes precedence.

Success:

- `200`
- `data.items[]`

Possible errors:

- `403`: non-admin access

### `GET /api/admin/users/:id`

Auth: admin bearer token required

Path param:

- `id`: integer, target user ID

Success:

- `200`
- `data.user` (detailed profile for moderation page)

Important returned fields:

- `id`
- `name`
- `email`
- `phone`
- `status`
- `rate`
- `contactInfo`
- `avatar`
- account flags (warnings, listing counts, etc.)

Possible errors:

- `404`: user not found

### `GET /api/admin/users/:id/listings`

Auth: admin bearer token required

Path param:

- `id`: integer, target user ID

Supported query params:

- `status`: `available`, `sold`, `archived`
- `page`: integer, min `1`, default `1`
- `limit`: integer, 1-100 (default `20`)
- `offset`: integer, 0-10000 (default `0`)

Success:

- `200`
- `data.items[]` — paginated product listings for the given user

Possible errors:

- `404`: user not found

### `PATCH /api/admin/users/:id/status`

Auth: admin bearer token required

Path param:

- `id`: integer, target user ID

Request body:

```json
{
  "status": "banned"
}
```

Allowed enum values:

- `active`
- `paused`
- `banned`

Success:

- `200`
- `data.user` with updated status

Possible errors:

- `404`: user not found

### `GET /api/admin/ratings/items/:itemId`

Auth: admin bearer token required

Required query param:

- `itemType`: `product`, `fault`, or `service`

Success:

- `200`
- paginated review rows for the target item

### `GET /api/admin/ratings/users/:userId`

Auth: admin bearer token required

Optional query param:

- `itemType`: `fault` or `service`

Success:

- `200`
- paginated review rows received on the user's owned Kayan faults/services

### `GET /api/admin/ratings`

Auth: admin bearer token required

Supported filters:

- `itemType`
- `userId`
- `ratingValue`
- `fromDate`
- `toDate`
- `search`
- pagination via `page`, `limit`, `offset`

Success:

- `200`
- mixed paginated `product` / `fault` / `service` review rows for moderation

### `DELETE /api/admin/users/:id`

Auth: admin bearer token required

Path param:

- `id`: integer, target user ID

Success:

- `200`
- message envelope

Possible errors:

- `404`: user not found

### `POST /api/admin/warnings`

Auth: admin bearer token required

Request body:

```json
{
  "targetUserId": 42,
  "message": "Your listing violated our terms of service."
}
```

Validation:

- `targetUserId`: required integer, min `1`
- `message`: required string, 2-2000 chars

Success:

- `201`
- `data.warning`

Possible errors:

- `404`: target user not found

### `GET /api/admin/admins`

Auth: admin bearer token required

Supported query params:

- Pagination (see `ListAdminPaginationQueryDto` — limit/offset style)

Success:

- `200`
- `data.items[]` — array of users with admin role

### `POST /api/admin/admins/:id`

Auth: admin bearer token required

Path param:

- `id`: integer, user ID to promote to admin

Request body:

_No request body._

Success:

- `200`
- `data.user` with admin role reflected

Possible errors:

- `404`: user not found

### `DELETE /api/admin/admins/:id`

Auth: admin bearer token required

Path param:

- `id`: integer, admin user ID to demote

Request body:

_No request body._

Success:

- `200`
- `data.user` with demoted role reflected

Possible errors:

- `404`: user not found

---

## `GET /api/users/:id` — Public User Profile

Auth: optional (uses `OptionalJwtAuthGuard`)

Path param:

- `id`: integer, target user ID

Supported query params:

- `page`: integer, min `1`, default `1`
- `limit`: integer, 1-50 (default `20`)
- `offset`: integer, min `0` (default `0`)

Success:

- `200`
- `data.user` — public profile info
- `data.listings[]` or similar nested structure with the user's active product listings

Possible errors:

- `404`: user not found

> [!NOTE]
> This is a **public** endpoint accessible without authentication. It returns only publicly visible data for the target user.

---

## Pagination Style Note

Admin user management endpoints (`/admin/users`, `/admin/users/:id/listings`, `/admin/admins`) accept both `page` and `offset`:

- `page`: optional page number, default `1`
- `limit`: page size
- `offset`: optional number of records to skip

If `offset` is present, it overrides the derived `(page - 1) * limit` value.

---

## Error Handling

- `400`: invalid payload, invalid enum value, message too short/long
- `401`: missing or invalid bearer token
- `403`: non-admin attempting admin routes
- `404`: user, admin, or listing not found

## QA Checklist

- Admin can list users with no filters.
- Admin can filter users by `status`.
- Admin can search users by `q` (name or phone substring).
- Admin can view user detail page with full profile.
- Admin can view user listings with and without status filter.
- `PATCH /api/admin/users/:id/status` succeeds for all three allowed statuses.
- `DELETE /api/admin/users/:id` soft-deletes the user.
- `POST /api/admin/warnings` creates a warning against a valid target user.
- `GET /api/admin/admins` returns current admin list.
- `POST /api/admin/admins/:id` promotes a regular user to admin.
- `DELETE /api/admin/admins/:id` demotes an admin to regular user.
- `GET /api/users/:id` returns public profile for a known user without auth.
- `GET /api/users/:id` with unknown user returns `404`.
- Non-admin hitting any `/admin/*` route receives `403`.
