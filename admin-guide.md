# BW Café — Admin API Guide

This guide documents how an **administrator** uses the BW Café API to manage products, orders, and users. It doubles as a manual test script and as the integration spec for the frontend team's admin dashboard.

## 1. Overview

- Base URL: `http://<host>/api/v1`.
- Response envelope is the same as the customer API — success: `{ success: true, statusCode, data }`, error: `{ success: false, statusCode, data: null, error }`.
- **Every endpoint in this guide requires** `Authorization: Bearer <accessToken>` for a user whose `role` is `ADMIN`. Non-admin tokens get rejected (403).
- **There is no public admin-registration endpoint.** Admins are created out-of-band via the seeder (`src/admin/admin-seeder.ts`), driven by the `ADMIN_PHONE` / `ADMIN_PASSWORD` environment variables (validated: phone must look like `+countrycode...`, password 8–64 chars with at least one letter and one digit). Running the seeder on an existing phone just promotes/resets that user to `ADMIN` + `ACTIVE`. To get an admin token, log in normally via `POST /auth/login` with those seeded credentials — there's no separate "admin login" endpoint.

## 2. Product management

### `POST /admin/products`
```json
{
  "category": "coffee",
  "title": "Cappuccino",
  "description": "Espresso with steamed milk foam",
  "price": 250
}
```
`category` is required and must be one of `coffee`, `breakfast`, `burger`, `shawarma`, `tacos`, or `drinks`. `description` is optional and has no field-level character limit. New products default to `isAvailable: true`.

### `PATCH /admin/products/:id`
Same fields as create, all optional — send only what changes.

### `DELETE /admin/products/:id`
Hard delete: permanently removes the product and its reviews. Historical order item references are set to `null` while their frozen order snapshots remain intact.

### `PATCH /admin/products/:id/availability`
```json
{ "isAvailable": false }
```
Use this to 86 an item temporarily without deactivating it entirely.

### `POST /admin/products/:id/image` / `DELETE /admin/products/:id/images/:fileId`
`POST` accepts `multipart/form-data` with the file field named `file` and adds an image in Cloudinary. Products return `images` in upload order, while `imageUrl` remains the first image for single-image clients. To remove an image, the admin selects its `fileId` from `images` and calls the targeted `DELETE` endpoint. Deleting the first image promotes the next one; deleting the final image sets `imageUrl` to `null`.

## 3. Order management

### `GET /admin/orders`
Query params (all optional):

| param | type | notes |
|---|---|---|
| `status` | one of `PENDING`, `CONFIRMED`, `PREPARING`, `READY`, `OUT_FOR_DELIVERY`, `COMPLETED`, `CANCELLED`, `REJECTED` | |
| `orderType` | `DELIVERY` \| `PICKUP` | |
| `orderNumber` | string | exact/partial match on e.g. `BW-20260713-0042` |
| `customerPhone` | string | |
| `fromDate` / `toDate` | `YYYY-MM-DD` | |
| `page` / `limit` / `offset` | pagination | |

Response `data`: `{ items: OrderDto[], total }` — same `OrderDto` shape as the customer API (§5 of `user-guide.md`), including full `items[]` line breakdown.

### `GET /admin/orders/:orderNumber`
Full order detail — this is the "invoice" view; it contains everything needed to print/display an invoice (customer info, items, subtotal/deliveryFee/total, screenshot URL, timestamps). No PDF generation happens server-side — that's a frontend concern.

### `PATCH /admin/orders/:orderNumber/status`
```json
{ "status": "CONFIRMED", "note": "Confirmed after reviewing screenshot" }
```
or, for a rejection:
```json
{ "status": "REJECTED", "reason": "Out of stock" }
```

**Transition rules enforced server-side** (violating these returns an error — don't rely on the frontend to pre-validate):

- `PENDING → CONFIRMED` requires a screenshot for `DELIVERY` orders; pickup orders can be confirmed without one.
- `PENDING → REJECTED` **requires `reason`**.
- `REJECTED`, `CANCELLED`, `COMPLETED` are terminal — no further transitions.
- `READY` is only valid for `PICKUP` orders.
- `OUT_FOR_DELIVERY` is only valid for `DELIVERY` orders.
- Admins can cancel any non-terminal order (unlike customers, who can only cancel `PENDING`/`CONFIRMED`).
- Every transition is recorded in an internal status-history log (not directly exposed via API today, but drives the audit trail).

Valid path (delivery): `PENDING → CONFIRMED → PREPARING → OUT_FOR_DELIVERY → COMPLETED`
Valid path (pickup): `PENDING → CONFIRMED → PREPARING → READY → COMPLETED`
Either can branch to `REJECTED` (only from `PENDING`) or `CANCELLED` (from any non-terminal state, admin-initiated).

## 4. User management

### `GET /admin/users`
Query params: `status` (`PENDING_VERIFICATION` \| `ACTIVE` \| `BLOCKED`), `q` (free-text search, 1–100 chars, matches name/phone), `page`/`limit`/`offset`.

Response `data.users`: array of `{ id, name, phone, role, status }`. No email field (see the gap note in `user-guide.md` — same underlying `UserDto`/`AdminUserDto`, neither has email).

### `GET /admin/users/:id`
Single user, same shape, wrapped as `data.user`.

### `PATCH /admin/users/:id/status`
```json
{ "status": "BLOCKED" }
```
Only `ACTIVE` or `BLOCKED` are valid targets here (you can't push a user back to `PENDING_VERIFICATION` through this endpoint). Blocking a user immediately prevents them from logging in going forward (existing access tokens still work until they expire/are refreshed — there's no forced session kill on block).

## 5. Quick manual test script (curl)

```bash
BASE=http://localhost:3000/api/v1

# 1. Log in as the seeded admin
curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"phone":"'"$ADMIN_PHONE"'","password":"'"$ADMIN_PASSWORD"'"}'
# -> save .data.accessToken as ADMIN_TOKEN

# 2. Create a product
curl -s -X POST $BASE/admin/products -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"category":"coffee","title":"Test Latte","price":300}'
# -> save .data.product.id as PRODUCT_ID (or check the actual response key)

# 3. Toggle availability off then back on
curl -s -X PATCH $BASE/admin/products/$PRODUCT_ID/availability -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"isAvailable":false}'
curl -s -X PATCH $BASE/admin/products/$PRODUCT_ID/availability -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"isAvailable":true}'

# 4. List pending orders
curl -s "$BASE/admin/orders?status=PENDING" -H "Authorization: Bearer $ADMIN_TOKEN"

# 5a. Try confirming a DELIVERY order with NO screenshot yet -> expect an error
curl -s -X PATCH $BASE/admin/orders/$ORDER_NUMBER/status -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"CONFIRMED"}'

# 5b. After the customer/guest has uploaded a delivery screenshot, confirm it
curl -s -X PATCH $BASE/admin/orders/$ORDER_NUMBER/status -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"CONFIRMED","note":"Verified payment"}'

# 6. Reject a different pending order (reason required)
curl -s -X PATCH $BASE/admin/orders/$OTHER_ORDER_NUMBER/status -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"REJECTED","reason":"Out of stock"}'

# 7. Block a user
curl -s -X PATCH $BASE/admin/users/$USER_ID/status -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"BLOCKED"}'

# 8. Confirm the blocked user can no longer log in
curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"phone":"'"$BLOCKED_USER_PHONE"'","password":"whatever-their-password-is"}'
# -> expect a rejection
```

## 6. Known gaps to flag to the frontend team

Same two as in `user-guide.md`, admin-relevant angle:
- No `email` field on `AdminUserDto`/`UserDto` — an admin "user list" screen with an email column has nothing to bind to today.
- No backend cart, so there's nothing for an admin dashboard to inspect as "abandoned carts" — that concept doesn't exist server-side; only submitted orders (`PENDING` and later) are ever persisted.
