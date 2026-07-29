# Final Backend Plan — BW Café Ordering System

This plan replaces ambiguities in the original SRS with the decisions established here. The SRS remains the functional baseline for authentication, products, orders, administration, cancellation, history, and reviews. 

## 1. Final scope and business decisions

The application is a single-restaurant ordering system with a flat product catalogue.

### Customers

Both guests and registered users can:

* Browse and search products.
* Place delivery or pickup orders.
* Upload a payment screenshot.
* View the specific order they created.
* Follow its current status.
* Cancel it when cancellation is allowed.

The only ordering-related difference is:

* A registered user can list their complete order history.
* A guest cannot retrieve a historical list of previous orders.

### Authentication

* Login uses phone number and password.
* OTP is not used as the normal login mechanism.
* OTP is used only to verify registration and reset forgotten passwords.
* Registration requires name, phone number, and password.
* SSN is not required.
* Administrators are created internally; there is no public admin registration.

### Products

* There are no categories.
* Every product has one image.
* Product data uses one canonical language.
* All interface translation is handled by the frontend.
* Products are deactivated rather than physically deleted when historical orders reference them.

### Orders and payments

* There is no `PaymentStatus`.
* There is no separate payment or payment-proof model.
* The payment screenshot is attached directly to the order.
* The backend does not interpret or validate the screenshot contents.
* An administrator manually accepts or rejects the order.
* `REJECTED` is an `OrderStatus`.
* Delivery address is one plain string field.
* The cart remains frontend-side; the backend receives cart items only during checkout.

### Files

* Cloudinary stores product images and order screenshots.
* A general `File` table stores Cloudinary metadata.
* There is no `FilePurpose`.
* Both `Product` and `Order` store:

  * Their copied URL for convenient API responses.
  * The associated `File` record ID for deletion and lifecycle management.

---

# 2. Technical architecture

Use a modular monolith:

```text
Frontend
   │
   ▼
NestJS REST API
   ├── PostgreSQL
   ├── Prisma ORM
   ├── Cloudinary
   └── SMS provider
```

Recommended stack:

```text
Runtime:         Node.js + TypeScript
Framework:       NestJS
Database:        PostgreSQL
ORM:             Prisma
Storage:         Cloudinary
Authentication:  JWT access and refresh tokens
API format:      REST
Documentation:   Swagger/OpenAPI
Deployment:      Docker
```

NestJS provides DTO-based request validation, route guards for authentication and authorization, and multipart file handling through file interceptors and validation pipes. ([NestJS Documentation][1])

Redis, queues, WebSockets, and microservices are not required for the first version.

---

# 3. Project structure

```text
src/
├── app.module.ts
├── main.ts
│
├── config/
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── auth.config.ts
│   ├── cloudinary.config.ts
│   └── validation.schema.ts
│
├── database/
│   ├── prisma.module.ts
│   ├── prisma.service.ts
│   └── seed/
│
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── public.decorator.ts
│   │   └── roles.decorator.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── optional-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── filters/
│   ├── interceptors/
│   ├── pagination/
│   ├── errors/
│   └── validation/
│
└── modules/
    ├── auth/
    ├── users/
    ├── products/
    ├── files/
    ├── orders/
    ├── reviews/
    └── admin/
```

The `admin` module should contain admin-facing controllers, but it should reuse `ProductsService`, `OrdersService`, and `FilesService` rather than duplicate their business logic.

---

# 4. Database design

## User

```text
User
- id
- name
- phone                  unique
- passwordHash
- role                   USER | ADMIN
- status                 PENDING_VERIFICATION | ACTIVE | BLOCKED
- phoneVerifiedAt        nullable
- createdAt
- updatedAt
```

## VerificationCode

Used for registration and password reset.

```text
VerificationCode
- id
- phone
- codeHash
- purpose                REGISTRATION | PASSWORD_RESET
- expiresAt
- attempts
- usedAt                 nullable
- createdAt
```

The code must be short-lived, single-use, stored as a hash, and protected by attempt limits. OWASP recommends short OTP lifetimes, single-use enforcement, strict attempt limits, and invalidating codes after successful verification. ([OWASP Cheat Sheet Series][2])

## RefreshToken

```text
RefreshToken
- id
- userId
- tokenHash
- expiresAt
- revokedAt              nullable
- createdAt
```

This supports explicit logout and refresh-token revocation.

## File

```text
File
- id
- assetId                unique
- publicId               unique
- url
- resourceType
- format                 nullable
- sizeBytes
- width                  nullable
- height                 nullable
- originalName           nullable
- mimeType               nullable
- createdAt
- updatedAt
```

There is no business-purpose field.

Cloudinary returns asset URLs, public IDs, dimensions, format, and other metadata after a successful upload. The `publicId` can be used with Cloudinary’s destroy operation, while `assetId` is the immutable Cloudinary asset identifier. ([Cloudinary][3])

## Product

```text
Product
- id
- title
- description            nullable
- details                nullable
- price
- quantity               nullable
- imageUrl               nullable
- imageFileId            nullable, unique
- isAvailable
- createdAt
- updatedAt
```

Relations:

```text
Product.imageFileId → File.id
```

`price` must use a decimal database type rather than a JavaScript floating-point value.

`quantity` can be nullable:

* `null`: stock quantity is not tracked.
* Integer: stock quantity is tracked.

`isAvailable` lets the administrator manually disable ordering without deleting the product.

## Order

```text
Order
- id
- orderNumber            unique
- userId                 nullable
- customerName
- customerPhone
- orderType              DELIVERY | PICKUP
- address                nullable
- pickupTime             nullable
- status
- screenshotUrl          nullable
- screenshotFileId       nullable, unique
- subtotal
- deliveryFee
- total
- currency               default MRU
- customerNotes          nullable
- cancellationReason     nullable
- rejectionReason        nullable
- guestAccessTokenHash   nullable
- createdAt
- updatedAt
- confirmedAt            nullable
- completedAt            nullable
- cancelledAt            nullable
- rejectedAt             nullable
```

Relations:

```text
Order.userId           → User.id
Order.screenshotFileId → File.id
```

For a guest order:

```text
userId = null
guestAccessTokenHash = hashed random token
```

For a registered-user order:

```text
userId = authenticated user ID
guestAccessTokenHash = null
```

Customer name and phone are copied into the order even for registered users so that historical checkout information remains unchanged when the user later edits their profile.

## OrderItem

```text
OrderItem
- id
- orderId
- productId              nullable
- productTitle
- unitPrice
- quantity
- lineTotal
```

`productTitle` and `unitPrice` are snapshots. Changing a product’s name or price must not modify old orders.

## OrderStatusHistory

```text
OrderStatusHistory
- id
- orderId
- previousStatus         nullable
- newStatus
- changedByUserId        nullable
- note                   nullable
- createdAt
```

This supports order follow-up and preserves an audit trail of administrative changes.

## Review — optional phase

```text
Review
- id
- userId
- productId
- orderItemId            unique
- rating
- comment                nullable
- createdAt
```

A review is permitted only when:

* The order is completed.
* The order belongs to the authenticated user.
* The order item has not already been reviewed.

---

# 5. Order statuses

```text
PENDING
CONFIRMED
PREPARING
READY
OUT_FOR_DELIVERY
COMPLETED
CANCELLED
REJECTED
```

## Meaning

### `PENDING`

The order has been created and is waiting for screenshot upload or administrator review.

### `CONFIRMED`

The administrator has accepted the order after reviewing its screenshot.

### `REJECTED`

The restaurant refused the order before accepting it.

### `CANCELLED`

The customer or administrator cancelled the order.

## Delivery workflow

```text
PENDING
  ├──→ REJECTED
  ├──→ CANCELLED
  └──→ CONFIRMED
          └──→ PREPARING
                  └──→ OUT_FOR_DELIVERY
                          └──→ COMPLETED
```

## Pickup workflow

```text
PENDING
  ├──→ REJECTED
  ├──→ CANCELLED
  └──→ CONFIRMED
          └──→ PREPARING
                  └──→ READY
                          └──→ COMPLETED
```

## Transition rules

* `PENDING → CONFIRMED` requires a screenshot.
* `PENDING → REJECTED` requires a rejection reason.
* `REJECTED`, `CANCELLED`, and `COMPLETED` are terminal.
* `READY` is valid only for pickup orders.
* `OUT_FOR_DELIVERY` is valid only for delivery orders.
* Customers and guests may cancel only `PENDING` or `CONFIRMED` orders.
* Administrators may cancel any non-terminal order.
* Every transition creates an `OrderStatusHistory` record.

---

# 6. Guest-order access

Guests must be able to access the specific order they created without receiving access to order history.

When a guest creates an order:

1. Generate a cryptographically random token.
2. Return the plain token once.
3. Store only its hash in `guestAccessTokenHash`.
4. Require it for guest order detail, screenshot upload, and cancellation.

Example response:

```json
{
  "orderNumber": "BW-20260713-0042",
  "guestAccessToken": "random-secret-token",
  "status": "PENDING",
  "total": "360.00",
  "currency": "MRU"
}
```

Guest requests use:

```http
X-Order-Token: random-secret-token
```

Registered users are authorized through the JWT and `order.userId`.

---

# 7. API contract

## Authentication

```http
POST /api/v1/auth/register
POST /api/v1/auth/verify-registration
POST /api/v1/auth/resend-registration-code

POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout

POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
```

Normal login remains:

```json
{
  "phone": "+22200000000",
  "password": "user-password"
}
```

NestJS supports username/password authentication followed by issuing a JWT bearer token and protecting routes with authentication guards. ([NestJS Documentation][4])

## User profile

```http
GET   /api/v1/me
PATCH /api/v1/me
PATCH /api/v1/me/password
```

The profile contains only basic account data. There are no saved addresses.

## Products — public

```http
GET /api/v1/products
GET /api/v1/products/:id
```

Supported filters:

```text
search
minPrice
maxPrice
available
sort
page
limit
```

Example:

```http
GET /api/v1/products?search=burger&available=true&sort=price_asc
```

## Products — admin

```http
POST   /api/v1/admin/products
PATCH  /api/v1/admin/products/:id
DELETE /api/v1/admin/products/:id

POST   /api/v1/admin/products/:id/image
DELETE /api/v1/admin/products/:id/image

PATCH  /api/v1/admin/products/:id/availability
```

`DELETE /admin/products/:id` permanently deletes the product. Historical order
snapshots remain available; their `productId` reference becomes `null`.

## Orders — guest or authenticated user

```http
POST  /api/v1/orders
GET   /api/v1/orders/:orderNumber
POST  /api/v1/orders/:orderNumber/screenshot
PATCH /api/v1/orders/:orderNumber/cancel
```

These endpoints use optional authentication:

* Authenticated request: authorize through `userId`.
* Guest request: authorize through `X-Order-Token`.

## Registered-user history

```http
GET /api/v1/me/orders
GET /api/v1/me/orders/:orderNumber
```

The history query must enforce:

```text
order.userId = authenticatedUser.id
```

Guest orders are never included in history.

## Admin orders

```http
GET   /api/v1/admin/orders
GET   /api/v1/admin/orders/:orderNumber
PATCH /api/v1/admin/orders/:orderNumber/status
```

Admin filters:

```text
status
orderType
orderNumber
customerPhone
fromDate
toDate
page
limit
```

The order-details response supplies all invoice information. Printing the invoice is handled by the frontend; the backend does not need to generate a PDF for the MVP.

## Reviews — optional

```http
POST /api/v1/orders/:orderNumber/items/:itemId/review
GET  /api/v1/products/:productId/reviews
```

---

# 8. Order creation workflow

Request:

```json
{
  "customerName": "Customer Name",
  "customerPhone": "+22200000000",
  "orderType": "DELIVERY",
  "address": "Full delivery address as one string",
  "items": [
    {
      "productId": "product-id",
      "quantity": 2
    }
  ],
  "customerNotes": "Call before arriving"
}
```

The client must not submit trusted prices or totals.

The backend performs:

1. Resolve optional authenticated user.
2. Validate delivery or pickup fields.
3. Load all products from the database.
4. Ensure products are active and available.
5. Validate quantities.
6. Use database prices.
7. Calculate each line total.
8. Calculate subtotal, delivery fee, and total.
9. Create the order.
10. Create immutable order-item snapshots.
11. Decrement stock when stock tracking is active.
12. Create the initial `PENDING` history record.
13. Return the guest token when the order is anonymous.

Order creation, items, stock changes, and status history must run in a single Prisma transaction. Prisma transactions ensure related database writes succeed or fail together. ([Prisma][5])

## Conditional validation

For delivery:

```text
address     required
pickupTime  forbidden or ignored
```

For pickup:

```text
pickupTime  required
address     forbidden or ignored
```

---

# 9. Cloudinary and file handling

## Upload strategy

Files are uploaded through the backend, not directly using public Cloudinary credentials.

```text
Frontend
   → multipart upload
NestJS
   → validate file
Cloudinary
   → return upload response
PostgreSQL
   → create File record and attach it
```

The Cloudinary API secret must remain server-side. Cloudinary supports authenticated server uploads through its Node.js SDK and explicitly warns against exposing the API secret in client code. ([Cloudinary][6])

Use Cloudinary’s `upload_stream` with the incoming Multer buffer so the application does not need permanent local upload storage. Cloudinary documents `upload_stream` for receiving files through Node.js streams. ([Cloudinary][6])

## Cloudinary folders

Use separate asset folders for organization:

```text
bw-cafe/products
bw-cafe/orders
```

These folders are storage organization only. They do not replace a `FilePurpose` field because no such database field is required.

## Product image upload

```http
POST /api/v1/admin/products/:id/image
Content-Type: multipart/form-data
```

Process:

1. Confirm admin authorization.
2. Validate the image.
3. Upload the new image to Cloudinary.
4. Create the new `File` record.
5. Update `Product.imageFileId`.
6. Copy `File.url` to `Product.imageUrl`.
7. Delete the previous Cloudinary image.
8. Delete the previous `File` row.

## Order screenshot upload

```http
POST /api/v1/orders/:orderNumber/screenshot
Content-Type: multipart/form-data
```

Process:

1. Authorize the registered owner or guest token.
2. Ensure the order is `PENDING`.
3. Validate the image.
4. Upload it to Cloudinary.
5. Create the `File` row.
6. Update `Order.screenshotFileId`.
7. Copy `File.url` to `Order.screenshotUrl`.
8. Delete any previously attached screenshot.

## Replacement safety

Cloudinary operations and PostgreSQL transactions cannot form one distributed transaction. Use compensating operations:

```text
1. Upload new Cloudinary asset.
2. Start database transaction.
3. Create File row.
4. Attach File ID and copied URL.
5. Commit transaction.
6. Delete old Cloudinary asset.
7. Delete old File row.
```

When database attachment fails:

```text
Delete the newly uploaded Cloudinary asset.
```

When deletion of the old asset fails:

```text
Keep the old unattached File row.
Log the failure.
Retry through a cleanup command or scheduled task.
```

A cleanup operation can find `File` rows that are associated with neither a product nor an order.

## Deletion

Use Cloudinary’s destroy operation with the stored `publicId` and request CDN invalidation:

```typescript
cloudinary.uploader.destroy(file.publicId, {
  resource_type: file.resourceType,
  invalidate: true,
});
```

Cloudinary supports destroying an asset by public ID or asset ID. The `invalidate` option requests invalidation of cached CDN copies, although propagation is not necessarily immediate. ([Cloudinary][7])

## Upload validation

Allow only required image formats, for example:

```text
image/jpeg
image/png
image/webp
```

Apply:

* MIME-type allowlist.
* Extension allowlist.
* File-signature validation.
* Maximum file size.
* Generated Cloudinary public IDs.
* Authentication or order-token authorization.
* Maximum image dimensions where appropriate.

OWASP recommends allowlisting extensions, validating actual file types rather than trusting the supplied content-type header, generating safe filenames, limiting file size, and applying authorization to uploads. ([OWASP Cheat Sheet Series][8])

---

# 10. URL and file-ID consistency

The duplicated fields are intentional:

```text
File.url
Product.imageUrl
Order.screenshotUrl
```

Rules:

* `File.url` is the canonical storage record.
* Product and order URLs are read-optimized copies.
* URL and file ID are always changed together.
* The frontend cannot send an arbitrary `fileId`.
* Files are created and attached internally by the appropriate resource endpoint.
* A file must not be associated with both a product and an order.

There should be no unrestricted endpoint such as:

```http
POST /api/v1/files
```

`FilesService` is an internal application service used by product and order modules.

---

# 11. Validation and security

Configure the global NestJS validation pipe with:

```typescript
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
```

NestJS’s `ValidationPipe` supports declarative DTO validation and removing or rejecting undeclared request properties. ([NestJS Documentation][9])

Additional requirements:

* Hash passwords with Argon2id.
* Hash refresh tokens, OTP codes, and guest-order tokens.
* Apply throttling to login, registration, OTP, and password-reset routes.
* Return generic responses for forgotten-password requests.
* Use role guards on every admin endpoint.
* Validate ownership on every customer-order endpoint.
* Use HTTPS in production.
* Never expose the Cloudinary API secret.
* Never accept totals or prices as trusted frontend input.
* Do not expose password hashes, token hashes, or OTP records in API responses.

OWASP recommends modern slow password hashing such as Argon2id rather than encryption or fast general-purpose hashes. ([OWASP Cheat Sheet Series][10])

---

# 12. Implementation phases

## Phase 1 — Foundation

* Initialize NestJS application.
* Configure PostgreSQL and Prisma.
* Add Docker Compose for local PostgreSQL.
* Add environment validation.
* Add global validation and error handling.
* Add request logging.
* Add Swagger/OpenAPI.
* Add health endpoint.
* Create initial Prisma migrations.
* Seed the first admin user.

## Phase 2 — Files and Cloudinary

* Create `CloudinaryModule`.
* Create internal `FilesModule`.
* Implement upload-stream integration.
* Implement file validation.
* Implement Cloudinary deletion.
* Implement orphan-file cleanup command.
* Test upload compensation when database writes fail.

## Phase 3 — Products

* Implement product model and migrations.
* Implement public product listing.
* Implement search, filtering, sorting, and pagination.
* Implement admin create and update.
* Implement product-image upload and replacement.
* Implement availability management.
* Implement soft deletion.
* Seed menu products from the supplied restaurant menu.

## Phase 4 — Authentication and users

* Implement phone/password registration.
* Implement registration OTP verification.
* Implement login.
* Implement access and refresh tokens.
* Implement logout and refresh-token revocation.
* Implement forgotten-password OTP flow.
* Implement profile endpoints.
* Implement admin and user role guards.

## Phase 5 — Orders

* Implement guest and authenticated checkout.
* Implement server-side price calculation.
* Implement order-item snapshots.
* Implement guest access tokens.
* Implement conditional delivery/pickup validation.
* Implement order screenshot upload.
* Implement order details.
* Implement registered-user history.
* Implement cancellation.
* Implement status-transition service.
* Implement status history.

## Phase 6 — Admin order management

* Implement admin order listing and filters.
* Implement order details.
* Implement confirmation and rejection.
* Implement preparation, delivery, pickup-ready, completion, and cancellation transitions.
* Add rejection and cancellation reasons.
* Return invoice-ready order data.

## Phase 7 — Optional features

* Reviews.
* Product stock decrementing.
* Notifications when order status changes.
* Expiration or cleanup of abandoned `PENDING` orders.
* Admin dashboard statistics.

## Phase 8 — Production readiness

* Unit tests for pricing and state transitions.
* Integration tests for authorization and database behavior.
* End-to-end guest, user, and admin flows.
* Upload and replacement failure tests.
* Docker production image.
* Database migration deployment process.
* Health checks and structured logging.
* Production environment and secret configuration.

---

# 13. Required tests

## Order tests

* Guest can create an order.
* Authenticated user can create an order.
* Only authenticated orders appear in user history.
* Guest cannot access history.
* Guest token gives access only to its specific order.
* Backend ignores frontend-supplied totals.
* Inactive products cannot be ordered.
* Invalid quantities are rejected.
* Delivery requires an address.
* Pickup requires a pickup time.
* Product price changes do not alter historical order items.

## Status tests

* Admin can confirm a pending order with a screenshot.
* Admin cannot confirm an order without a screenshot.
* Only delivery orders can become `OUT_FOR_DELIVERY`.
* Only pickup orders can become `READY`.
* Rejection requires a reason.
* Invalid transitions are rejected.
* Terminal orders cannot change status.

## File tests

* Invalid image types are rejected.
* Oversized images are rejected.
* Replacing an image deletes the old Cloudinary asset.
* A failed database write triggers deletion of the new upload.
* Product deletion does not leave its image indefinitely.
* Order screenshot replacement works only while pending.

## Authorization tests

* Public users can list products.
* Non-admin users cannot modify products.
* Users cannot access another user’s order.
* Guest tokens cannot access unrelated orders.
* Blocked users cannot authenticate.
* Refresh-token revocation works.

---

# 14. Explicitly out of scope

The backend will not include:

* Product categories.
* Backend localization or translation tables.
* Multiple product images.
* Structured or saved addresses.
* Geolocation or maps.
* A backend cart.
* A separate payment model.
* A payment-status enum.
* Payment-gateway integration.
* Screenshot OCR or automated payment verification.
* `FilePurpose`.
* Direct unrestricted file-upload endpoints.
* Delivery-driver accounts or live tracking.
* WebSockets.
* Microservices.
* Redis or queues for the initial implementation.
* Backend PDF invoice generation.

[1]: https://docs.nestjs.com/techniques/file-upload "File upload | NestJS - A progressive Node.js framework"
[2]: https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html?utm_source=chatgpt.com "Multifactor Authentication - OWASP Cheat Sheet Series"
[3]: https://cloudinary.com/documentation/upload_images "Programmatically Uploading Images, Videos, and Other Files | Documentation"
[4]: https://docs.nestjs.com/security/authentication "Authentication | NestJS - A progressive Node.js framework"
[5]: https://www.prisma.io/docs/orm/prisma-client/queries/transactions "Transactions and batch queries (Reference) | Prisma Documentation"
[6]: https://cloudinary.com/documentation/node_image_and_video_upload "Node.js image and video upload | Documentation"
[7]: https://cloudinary.com/documentation/image_upload_api_reference "Upload API Reference | Documentation"
[8]: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html "File Upload - OWASP Cheat Sheet Series"
[9]: https://docs.nestjs.com/techniques/validation "Validation | NestJS - A progressive Node.js framework"
[10]: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html?utm_source=chatgpt.com "Password Storage - OWASP Cheat Sheet Series"
