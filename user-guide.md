# BW Café — Customer & Guest API Guide

This guide documents how a **guest** (no account) or a **registered customer** uses the BW Café ordering API. It is meant to be usable both as a manual test script and as the integration spec for the frontend team.

> ⚠️ **Known gaps vs. the original spec (`plan.md`)**
> - **No email field.** Users are identified purely by `phone`. There is no `email` anywhere in registration, login, or the profile response. If your UI has an email field, it currently has nowhere to go on the backend.
> - **No persisted server-side cart.** There is no `GET/POST /cart` API. The cart lives entirely on the frontend (local state); it's only sent to the backend once, as the `items` array on `POST /orders` at checkout time.

## 1. Overview

- Base URL: `http://<host>/api/v1` (prefix is fixed, see `src/main.ts`).
- Every response is wrapped in an envelope:

  Success:
  ```json
  { "success": true, "statusCode": 200, "data": { /* endpoint-specific payload */ } }
  ```
  Error:
  ```json
  {
    "success": false,
    "statusCode": 409,
    "data": null,
    "error": { "code": 409, "message": "Conflict", "timestamp": "2026-07-13T12:00:00.000Z", "path": "/api/v1/orders" }
  }
  ```
- Auth mechanisms:how
  - **Registered user**: `Authorization: Bearer <accessToken>` (obtained from login/refresh).
  - **Guest, on their own order only**: `X-Order-Token: <guestAccessToken>` header — the token is handed back exactly once, in the response of `POST /orders`. There is no way to recover it later, so the frontend must persist it (e.g. localStorage) if the guest should be able to check the order again.
- All endpoints below accept/return JSON except the two file-upload endpoints noted, which are `multipart/form-data`.

## 2. Browsing products (no auth required)

### `GET /products`
Query params (all optional):

| param | type | notes |
|---|---|---|
| `page` | number ≥ 1 | default paging |
| `limit` | number, 1–100 | |
| `offset` | number ≥ 0 | |
| `search` | string | free-text search over title/description |
| `minPrice` / `maxPrice` | number | |
| `available` | boolean | compatibility filter; public results are always available, so `false` returns no products |
| `category` | `coffee` \| `breakfast` \| `burger` \| `shawarma` \| `tacos` \| `drinks` | filter to a menu category |
| `sort` | `price_asc` \| `price_desc` \| `newest` | |

Example: `GET /api/v1/products?category=coffee&search=latte&available=true&sort=price_asc`

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "items": [
      {
        "id": 1,
        "category": "coffee",
        "title": "Cappuccino",
        "description": "Espresso with steamed milk foam",
        "details": "Contains dairy",
        "price": 250,
        "quantity": 50,
        "imageUrl": "https://res.cloudinary.com/demo/image/upload/bw-cafe/products/1.jpg",
        "isAvailable": true,
        "createdAt": "2026-03-28T12:00:00.000Z",
        "updatedAt": "2026-03-28T12:00:00.000Z"
      }
    ],
    "total": 42
  }
}
```

`quantity: null` means stock isn't tracked for that product (always orderable while `isAvailable`); an integer means live stock.

### `GET /products/:id`
Same `ProductDto` shape as above, single object under `data.product`... actually returned as `data` directly matching `ProductDto` fields — check the live response; treat `ProductListDataDto`/`ProductDataDto` as the source of truth if it differs slightly from a list item.

### `GET /products/:id/reviews`
Paginated (`page`, `limit`, `offset`). Each item: `{ id, productId, rating, comment, createdAt }`.

## 3. Registration & login (phone + password)

There is no email step anywhere in this flow.

1. **`POST /auth/register`**
   ```json
   { "name": "Ahmed Ali", "phone": "+22200000000", "password": "Secret123" }
   ```
   Creates the user in `PENDING_VERIFICATION` status and sends an OTP via SMS to `phone`.

2. **`POST /auth/verify-registration`**
   ```json
   { "phone": "+22200000000", "code": "000000" }
   ```
   Moves the user to `ACTIVE`.

3. **`POST /auth/resend-registration-code`** — `{ "phone": "+22200000000" }` if the OTP expired or was lost.

4. **`POST /auth/login`**
   ```json
   { "phone": "+22200000000", "password": "Secret123" }
   ```
   Response `data`:
   ```json
   {
     "user": { "id": 1, "name": "Ahmed Ali", "phone": "+22200000000", "role": "USER", "status": "ACTIVE" },
     "accessToken": "eyJ...",
     "refreshToken": "eyJ..."
   }
   ```
   Blocked (`status: BLOCKED`) or unverified users cannot log in.

5. **`POST /auth/refresh`** — `{ "refreshToken": "..." }` → new token pair.

6. **`POST /auth/logout`** — `{ "refreshToken": "..." }` → revokes that refresh token.

7. **Forgotten password**:
   - `POST /auth/forgot-password` — `{ "phone": "+22200000000" }` (always returns a generic success, whether or not the phone exists — don't use this to probe for registered numbers).
   - `POST /auth/reset-password` — `{ "phone": "...", "code": "000000", "newPassword": "NewSecret123", "confirmPassword": "NewSecret123" }`.

## 4. Profile (requires `Authorization: Bearer`)

- **`GET /me`** → `data.user` = `{ id, name, phone, role, status }`. No `email`.
- **`PATCH /me`** → body: `{ "name": "New Name" }`. Only `name` is editable today; there's no other profile field to update (no email, no address book).
- **`PATCH /me/password`** → `{ "oldPassword": "...", "newPassword": "..." }`.

## 5. Placing an order (guest or logged in)

There is no cart endpoint. The frontend accumulates `{ productId, quantity }` pairs locally as the user shops, then submits them all at once at checkout.

### `POST /orders`
Works identically whether or not you're logged in — if you send `Authorization: Bearer`, the order is linked to your account (`userId`); otherwise it's a guest order.

```json
{
  "customerName": "Customer Name",
  "customerPhone": "+22200000000",
  "orderType": "DELIVERY",
  "address": "Full delivery address as one string",
  "items": [
    { "productId": 1, "quantity": 2 },
    { "productId": 3, "quantity": 1 }
  ],
  "customerNotes": "Call before arriving"
}
```

- `address` is optional for delivery orders. `orderType: "PICKUP"` requires `pickupTime` (ISO datetime); pickup orders do not use an address.
- **Never send price or total** — the server always recalculates from the current DB price of each product and ignores any client-supplied amounts.
- Ordering an unavailable product is rejected.

Response `data.order` (`OrderDto`):
```json
{
  "id": 10,
  "orderNumber": "BW-20260713-0042",
  "customerName": "Customer Name",
  "customerPhone": "+22200000000",
  "orderType": "DELIVERY",
  "address": "Full delivery address as one string",
  "status": "PENDING",
  "subtotal": 500,
  "deliveryFee": 0,
  "total": 500,
  "currency": "MRU",
  "createdAt": "2026-07-13T12:00:00.000Z",
  "items": [
    { "id": 1, "productId": 1, "productTitle": "Cappuccino", "unitPrice": 250, "quantity": 2, "lineTotal": 500 }
  ],
  "guestAccessToken": "random-secret-token"
}
```
`guestAccessToken` is only present for guest orders — **save it immediately**, it's shown once. Send it back as `X-Order-Token` on every subsequent call for this order.

### `GET /orders/:orderNumber`
Owner via JWT, or guest via `X-Order-Token`. Returns the same `OrderDto` (no `guestAccessToken` on repeat fetches).

### `POST /orders/:orderNumber/screenshot`
`multipart/form-data`, file field name `file`. Attaches an optional payment screenshot. Delivery orders need one before an admin can confirm them; pickup orders do not. Uploads are only allowed while the order is still `PENDING`; re-uploading replaces the previous screenshot.

### `PATCH /orders/:orderNumber/cancel`
```json
{ "reason": "Changed my mind" }
```
(`reason` optional.) Only allowed while `PENDING` or `CONFIRMED`.

### Order status lifecycle

```
PENDING
  ├──→ REJECTED             (admin rejects; requires a reason)
  ├──→ CANCELLED             (customer/guest or admin cancels; PENDING/CONFIRMED only for customer)
  └──→ CONFIRMED              (delivery requires a screenshot; pickup does not)
          └──→ PREPARING
                  ├──→ READY               (pickup orders only)
                  └──→ OUT_FOR_DELIVERY    (delivery orders only)
                          └──→ COMPLETED
```
`REJECTED`, `CANCELLED`, `COMPLETED` are terminal — no further status changes.

For completed pickup orders, the returned order also includes the payment details recorded by the admin: `paymentMethod` (`CASH` or `BANK`) and, for bank payments, `bankName`.

## 6. Order history (registered users only)

- **`GET /me/orders`** — paginated (`page`, `limit`, `offset`) list of your own orders, newest first. Guests cannot list history — the `X-Order-Token` only ever unlocks a single order, not a list.
- **`GET /me/orders/:orderNumber`** — same as `GET /orders/:orderNumber` but scoped to guarantee it belongs to you.

## 7. Reviews (registered users only)

### `POST /orders/:orderNumber/items/:itemId/review`
Requires `Authorization: Bearer`. Only allowed when:
- the order belongs to you,
- the order is `COMPLETED`,
- that specific order item hasn't already been reviewed.

```json
{ "rating": 5, "comment": "Great coffee!" }
```

### `GET /products/:productId/reviews`
Public, paginated — see §2.

## 8. Quick manual test script (curl)

Set a base URL once:
```bash
BASE=http://localhost:3000/api/v1
```

### Registered-user happy path
```bash
# 1. Register
curl -s -X POST $BASE/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Test User","phone":"+22200000001","password":"Secret123"}'

# 2. Verify (grab the OTP from SMS logs / dev console)
curl -s -X POST $BASE/auth/verify-registration -H 'Content-Type: application/json' \
  -d '{"phone":"+22200000001","code":"000000"}'

# 3. Login
curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"phone":"+22200000001","password":"Secret123"}'
# -> save .data.accessToken as TOKEN

# 4. Browse
curl -s "$BASE/products?available=true"

# 5. Place an order
curl -s -X POST $BASE/orders -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"customerName":"Test User","customerPhone":"+22200000001","orderType":"PICKUP","pickupTime":"2026-07-14T10:00:00.000Z","items":[{"productId":1,"quantity":2}]}'
# -> save .data.order.orderNumber as ORDER_NUMBER

# 6. Upload payment screenshot (required before delivery confirmation; optional for pickup)
curl -s -X POST $BASE/orders/$ORDER_NUMBER/screenshot -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/screenshot.png"

# 7. Check status
curl -s $BASE/orders/$ORDER_NUMBER -H "Authorization: Bearer $TOKEN"

# 8. View order history
curl -s $BASE/me/orders -H "Authorization: Bearer $TOKEN"
```

### Guest path
```bash
# 1. Place an order with no Authorization header
curl -s -X POST $BASE/orders -H 'Content-Type: application/json' \
  -d '{"customerName":"Guest","customerPhone":"+22200000002","orderType":"DELIVERY","address":"1 Main St","items":[{"productId":1,"quantity":1}]}'
# -> save .data.order.orderNumber as ORDER_NUMBER, .data.order.guestAccessToken as GUEST_TOKEN

# 2. Check status as a guest
curl -s $BASE/orders/$ORDER_NUMBER -H "X-Order-Token: $GUEST_TOKEN"

# 3. Cancel as a guest
curl -s -X PATCH $BASE/orders/$ORDER_NUMBER/cancel -H "X-Order-Token: $GUEST_TOKEN" -H 'Content-Type: application/json' \
  -d '{"reason":"Changed my mind"}'
```
