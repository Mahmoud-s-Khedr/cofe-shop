# Image Upload Integration Guide

This guide describes how a frontend uploads product images and order payment screenshots to the API. The frontend sends the image to the API; the API validates it, stores it in Cloudinary, and returns the updated product or order with its public image URL.

## API origin

All endpoints below are prefixed with `/api/v1`. For example, when the API is hosted at `https://api.example.com`, pass `https://api.example.com` as `apiBaseUrl` in the examples below.

## Rules shared by both endpoints

- Send `multipart/form-data`.
- Add the image under the form field name `file`.
- Accepted formats: JPEG (`.jpg`, `.jpeg`), PNG (`.png`), and WebP (`.webp`).
- Maximum file size: 5 MB.
- The server checks the MIME type, extension, and file signature. Renaming a non-image file to `.jpg` will be rejected.
- Do **not** manually set the `Content-Type` request header when using `FormData`; the browser supplies the required multipart boundary.

The API uses this response envelope:

```json
{
  "success": true,
  "statusCode": 200,
  "data": {}
}
```

On failure, `success` is `false` and `error.message` contains a user-safe reason.

```json
{
  "success": false,
  "statusCode": 400,
  "data": null,
  "error": {
    "code": 400,
    "message": "Only JPEG, PNG, and WEBP images are allowed",
    "timestamp": "2026-07-23T10:00:00.000Z",
    "path": "/api/v1/orders/BW-20260713-0042/screenshot"
  }
}
```

## 1. Upload a product image (admin)

### Endpoint

```http
POST /api/v1/admin/products/:id/image
Authorization: Bearer <admin-access-token>
Content-Type: multipart/form-data
```

Only authenticated administrators can call this endpoint. `:id` is the numeric product ID.

Each upload adds an image to the product. Images are returned in upload order; the first image is also exposed as `imageUrl` for compatibility with clients that only display one image.

To remove a selected image, call:

```http
DELETE /api/v1/admin/products/:id/images/:fileId
Authorization: Bearer <admin-access-token>
```

`:fileId` is the selected image's `fileId` from `product.images`. If the first image is deleted, the next remaining image becomes `imageUrl`; deleting the final image sets `imageUrl` to `null`.

### Browser `fetch` example

```ts
type Product = {
  id: number;
  imageUrl: string | null;
  images: Array<{ fileId: number; url: string }>;
  // Other product fields are also returned.
};

type ApiResponse<T> = {
  success: boolean;
  statusCode: number;
  data: T;
};

export async function uploadProductImage(
  apiBaseUrl: string,
  productId: number,
  file: File,
  adminAccessToken: string,
): Promise<Product> {
  validateImageBeforeUpload(file);

  const form = new FormData();
  form.append('file', file);

  const response = await fetch(`${apiBaseUrl}/api/v1/admin/products/${productId}/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminAccessToken}` },
    body: form,
  });

  const payload = (await response.json()) as ApiResponse<{ product: Product }>;
  if (!response.ok || !payload.success) {
    throw new Error((payload as any).error?.message ?? 'Could not upload product image');
  }

  return payload.data.product;
}
```

Successful response (abbreviated):

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "product": {
      "id": 12,
      "title": "Cappuccino",
      "imageUrl": "https://res.cloudinary.com/.../bw-cafe/products/...",
      "images": [
        {
          "fileId": 34,
          "url": "https://res.cloudinary.com/.../bw-cafe/products/..."
        }
      ]
    }
  }
}
```

## 2. Upload a payment screenshot

### Endpoint

```http
POST /api/v1/orders/:orderNumber/screenshot
Content-Type: multipart/form-data
```

The request must identify the order owner in one of these ways:

- Authenticated customer: `Authorization: Bearer <access-token>`
- Guest customer: `X-Order-Token: <guestAccessToken>`

For guest checkout, save `guestAccessToken` from the response to `POST /api/v1/orders` immediately. It is returned only once and is needed to retrieve, cancel, or upload a screenshot for that guest order.

Screenshots may only be uploaded while the order status is `PENDING`. They are required before an admin can confirm a delivery order, but optional for pickup orders. A subsequent upload while still pending replaces the previous screenshot and removes the old Cloudinary asset.

### Browser `fetch` example

```ts
type Order = {
  orderNumber: string;
  status: string;
  screenshotUrl: string | null;
  // Other order fields are also returned.
};

export async function uploadPaymentScreenshot(
  apiBaseUrl: string,
  orderNumber: string,
  file: File,
  auth: { accessToken?: string; guestAccessToken?: string },
): Promise<Order> {
  validateImageBeforeUpload(file);

  const form = new FormData();
  form.append('file', file);

  const headers: HeadersInit = {};
  if (auth.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;
  if (auth.guestAccessToken) headers['X-Order-Token'] = auth.guestAccessToken;

  const response = await fetch(`${apiBaseUrl}/api/v1/orders/${orderNumber}/screenshot`, {
    method: 'POST',
    headers,
    body: form,
  });

  const payload = (await response.json()) as ApiResponse<{ order: Order }>;
  if (!response.ok || !payload.success) {
    throw new Error((payload as any).error?.message ?? 'Could not upload payment screenshot');
  }

  return payload.data.order;
}
```

Successful response (abbreviated):

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "order": {
      "orderNumber": "BW-20260713-0042",
      "status": "PENDING",
      "screenshotUrl": "https://res.cloudinary.com/.../bw-cafe/orders/..."
    }
  }
}
```

## File input and client-side validation

Use an `accept` attribute to guide users, then validate size and MIME type before starting the request. Client validation improves the experience, but server validation is authoritative.

```tsx
<input
  type="file"
  accept="image/jpeg,image/png,image/webp"
  onChange={(event) => {
    const file = event.currentTarget.files?.[0];
    if (file) void uploadPaymentScreenshot(apiBaseUrl, orderNumber, file, { guestAccessToken });
  }}
/>
```

```ts
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function validateImageBeforeUpload(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Choose a JPEG, PNG, or WebP image.');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Choose an image smaller than 5 MB.');
  }
}
```

## Displaying the uploaded image

Use `data.product.images` for product galleries, or `data.product.imageUrl` when only the primary image is needed. Use `data.order.screenshotUrl` for payment screenshots. These are Cloudinary HTTPS URLs and can be assigned to an image source.

```tsx
{imageUrl && <img src={imageUrl} alt="Uploaded image" />}
```

Do not construct Cloudinary URLs in the frontend or expose Cloudinary credentials. The API owns uploads, replacement, deletion, and storage metadata.
