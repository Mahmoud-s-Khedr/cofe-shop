# Module 3 Integration Guide: Products, Cart, and Orders

## Purpose

This guide covers:

- public product browsing
- admin product CRUD
- cart management
- order creation and lifecycle
- delivered-product rating

Shared contract:

- [frontend-integration-shared-contract.md](./frontend-integration-shared-contract.md)

## Flow-by-Flow Implementation

### Public Product Catalog

1. Load products with `GET /api/products`.
2. Apply optional filters and sort controls.
3. Load details with `GET /api/products/:id`.
4. Render product assets from separate `images` and `files` arrays.

### Admin Product Management

1. Upload product assets first when needed.
2. Create product with `POST /api/admin/products`.
3. Update product with `PATCH /api/admin/products/:id`.
4. Soft-delete product with `DELETE /api/admin/products/:id`.

### Cart and Checkout

1. Add item: `POST /api/cart/items`
2. Update quantity: `PATCH /api/cart/items/:id`
3. Read cart: `GET /api/cart`
4. Remove item: `DELETE /api/cart/items/:id`
5. Checkout: `POST /api/cart/checkout`

### Direct Order Creation

The backend still supports direct order creation in addition to cart checkout:

- `POST /api/orders`

Use this only if the frontend needs a no-cart path. Otherwise prefer cart checkout.

### Order Tracking

User routes:

- `GET /api/orders/me`
- `GET /api/orders/:id`
- `PATCH /api/orders/:id/address`
- `POST /api/orders/:id/cancel`

Admin routes:

- `GET /api/admin/orders`
- `PATCH /api/admin/orders/:id/status`

### Product Rating After Delivery

Once an order is delivered, the user can rate a purchased product one time:

- `POST /api/ratings`

## Endpoint Contract

### `GET /api/products`

Public route.

Supported query params:

- `query`
- `minPrice`
- `maxPrice`
- `fromDate`
- `toDate`
- `availability`: `active`, `inactive`, `all` (`inactive`/`all` are effective for admins only)
- `sortBy`: `createdAt`, `price`
- `sortDirection`: `asc`, `desc`
- `page`: integer, min `1`, default `1`
- `limit`: integer, min `1`, max `100`
- `offset`: integer, min `0`

Defaults:

- public and regular users always see active products only
- admins default to all non-deleted products
- `sortBy` defaults to `createdAt`
- `sortDirection` defaults to `desc`

Optional rating filters:

- `minRate`: integer, 1-5
- `maxRate`: integer, 1-5

Success shape:

- `200`
- `data.items[]`

Important product fields:

- `id`
- `title`
- `description`
- `amount`
- `price`
- `details`
- `images[]`
- `files[]`

### `GET /api/products/:id`

Public route.

Success:

- `200`
- `data.product`

Errors:

- `404`: product not found

### `POST /api/admin/products`

Auth: admin bearer token required

Request example:

```json
{
  "title": "Water Pump",
  "description": "1.5 HP high pressure pump",
  "amount": 25,
  "price": 3500,
  "details": {
    "brand": "Kayan",
    "warrantyMonths": 12
  },
  "imageFileIds": [101, 102],
  "fileIds": [201]
}
```

Validation:

- `title`: required non-empty string
- `description`: required non-empty string
- `amount`: integer, min `0`
- `price`: number, min `0`
- `details`: optional object
- `imageFileIds`: optional integer array
- `fileIds`: optional integer array

Success:

- `201`
- `data.product` with asset arrays attached

### `PATCH /api/admin/products/:id`

Auth: admin bearer token required

Editable fields:

- `title`
- `description`
- `amount`
- `price`
- `details`
- `isActive`
- `imageFileIds`
- `fileIds`

Success:

- `200`
- `data.product`

Errors:

- `404`: product not found

### `DELETE /api/admin/products/:id`

Auth: admin bearer token required

Success:

- `200`
- message envelope

### `GET /api/cart`

Auth: bearer token required

Success:

- `200`
- `data.items[]`

Important cart item fields:

- `id`
- `product_id`
- `quantity`
- `created_at`
- `updated_at`
- `product`

### `POST /api/cart/items`

Request:

```json
{
  "productId": 12,
  "quantity": 1
}
```

Validation:

- `productId`: integer, min `1`
- `quantity`: integer, min `1`

Behavior:

- if the product is already in the cart, quantity is increased
- success returns the full current cart in `data.items`

### `PATCH /api/cart/items/:id`

Request:

```json
{
  "quantity": 2
}
```

Success:

- `200`
- returns the full current cart in `data.items`

Errors:

- `404`: cart item not found

### `DELETE /api/cart/items/:id`

Success:

- `200`
- message envelope

Errors:

- `404`: cart item not found

### `POST /api/cart/checkout`

Request:

```json
{
  "deliveryAddress": "Cairo, Nasr City, Abbas Al Akkad"
}
```

Success:

- `201`
- returns `data.order`
- cart is cleared by the backend after successful checkout

### `POST /api/orders`

Request:

```json
{
  "deliveryAddress": "Cairo, New Cairo, Fifth Settlement",
  "items": [
    {
      "productId": 12,
      "quantity": 1
    }
  ]
}
```

Validation:

- `deliveryAddress`: required non-empty string
- `items[]`: required non-empty array
- each item requires `productId` and `quantity` as positive integers

### `GET /api/orders/me`

Auth: bearer token required

Supported query params:

- `status`
- `fromDate`
- `toDate`
- `sortBy`: `createdAt`
- `sortDirection`: `asc`, `desc`
- `page`: integer, min `1`, default `1`
- `limit`: integer, min `1`, max `100`
- `offset`: integer, min `0`

Success:

- `200`
- `data.items[]`

### `GET /api/orders/:id`

Auth: bearer token required

Success:

- `200`
- `data.order`

Important order fields:

- `id`
- `user_id`
- `delivery_address`
- `status`
- `created_at`
- `updated_at`
- `item_count`
- `items[]`

Important order item fields:

- `id`
- `product_id`
- `quantity`
- `unit_price`
- `product.id`
- `product.title`
- `product.description`
- `product.price`

### `PATCH /api/orders/:id/address`

Allowed only while order status is `received`.

Request:

```json
{
  "deliveryAddress": "Cairo, New Cairo, Fifth Settlement"
}
```

Success:

- `200`
- returns updated `data.order`

### `POST /api/orders/:id/cancel`

Allowed only while order status is `received`.

Success:

- `200`
- returns updated `data.order`

### `GET /api/admin/orders`

Auth: admin bearer token required

Supported query params:

- `status`: `received`, `ready_to_ship`, `on_the_way`, `cancelled`, `delivered`
- `fromDate`
- `toDate`
- `sortBy`: `createdAt`
- `sortDirection`: `asc`, `desc`
- `page`: integer, min `1`
- `limit`: integer, min `1`, max `100`
- `offset`: integer, min `0`

Success:

- `200`
- `data.items[]`
- each order includes nested `user`

### `PATCH /api/admin/orders/:id/status`

Auth: admin bearer token required

Request:

```json
{
  "status": "ready_to_ship"
}
```

Allowed enum values:

- `received`
- `ready_to_ship`
- `on_the_way`
- `cancelled`
- `delivered`

Important note:

- The frontend should follow the canonical progression `received -> ready_to_ship -> on_the_way -> delivered`.
- Current backend code validates the enum value, but does not strictly enforce the admin progression sequence.

### `POST /api/ratings`

Delivered product rating request:

```json
{
  "itemType": "order",
  "orderId": 101,
  "productId": 12,
  "ratingValue": 5
}
```

Validation:

- `itemType` must be `order`
- `orderId`: integer, min `1`
- `productId`: integer, min `1`
- `ratingValue`: integer, `1-5`

Rules:

- order must belong to the authenticated user
- order status must be `delivered`
- the product must exist in that order
- duplicate rating is rejected

## Error Handling

- `400`: invalid payload, invalid product, insufficient stock, empty cart, invalid order state, rating blocked, duplicate rating
- `401`: missing or invalid bearer token
- `403`: access to another user’s order or protected resource
- `404`: product, order, or cart item not found

## QA Checklist

- Product list works with default params and explicit filter/sort params.
- Product details load correctly.
- Admin can create, update, and delete products.
- User can add, update, list, and remove cart items.
- Cart checkout returns an order and clears the cart.
- Direct order creation works with explicit items.
- User can list and read own orders.
- Order address update succeeds only while `received`.
- Order cancel succeeds only while `received`.
- Admin order list returns all orders with nested user info.
- Admin can set canonical statuses in sequence.
- Product rating works only after delivery and fails on duplicate submission.
