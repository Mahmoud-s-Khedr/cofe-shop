# Kayan SRS -> V2 Mapping Matrix

| Kayan SRS Use Case | Endpoint(s) | Table(s) | Status |
|---|---|---|---|
| List/Search Products | `GET /api/products`, `GET /api/products/:id` | `catalog_products`, `product_assets` | Implemented |
| Admin Add/Update/Delete Product | `POST/PATCH/DELETE /api/admin/products*` | `catalog_products`, `product_assets` | Implemented |
| Order Product | `POST /api/orders`, `GET/POST/PATCH/DELETE /api/cart*`, `POST /api/cart/checkout` | `product_orders`, `order_items`, `order_status_history`, `cart_items` | Implemented |
| My Orders / Details | `GET /api/orders/me`, `GET /api/orders/:id` | `product_orders`, `order_items` | Implemented |
| Cancel Order (before processing) | `POST /api/orders/:id/cancel` | `product_orders`, `order_status_history` | Implemented |
| Update Order Address (before processing) | `PATCH /api/orders/:id/address` | `product_orders` | Implemented |
| Admin View/Update Orders | `GET /api/admin/orders`, `PATCH /api/admin/orders/:id/status` | `product_orders`, `order_status_history` | Implemented |
| Report Fault | `POST /api/faults` | `fault_reports`, `fault_assets`, `fault_status_history` | Implemented |
| Update Fault / Cancel Fault | `PATCH /api/faults/:id`, `POST /api/faults/:id/cancel` | `fault_reports`, `fault_assets`, `fault_status_history` | Implemented |
| My Faults | `GET /api/faults/me` | `fault_reports` | Implemented |
| Admin List/Update Faults | `GET /api/admin/faults`, `PATCH /api/admin/faults/:id/status` | `fault_reports`, `fault_status_history` | Implemented |
| Order Service | `POST /api/services` | `service_orders`, `service_status_history` | Implemented |
| Update/Cancel Service | `PATCH /api/services/:id`, `POST /api/services/:id/cancel` | `service_orders`, `service_status_history` | Implemented |
| My Services | `GET /api/services/me` | `service_orders` | Implemented |
| Admin List/Update Services | `GET /api/admin/services`, `PATCH /api/admin/services/:id/status` | `service_orders`, `service_status_history` | Implemented |
| Follow-up Steps (read) | `GET /api/followups/:itemType/:itemId/steps` | `followup_steps` | Implemented |
| Follow-up Steps Admin CRUD | `POST/PATCH/DELETE /api/admin/followups/:itemType/:itemId/steps*` | `followup_steps` | Implemented |
| Item Chat (optional) | `POST /api/followups/:itemType/:itemId/chat/conversations`, `GET/POST /api/followups/:itemType/:itemId/chat/conversations/:id/messages` | `followup_conversations`, `followup_messages` | Implemented |
| Gallery List | `GET /api/gallery` | `gallery_items`, `gallery_assets` | Implemented |
| Gallery Admin CRUD | `POST/PATCH/DELETE /api/admin/gallery*` | `gallery_items`, `gallery_assets` | Implemented |
| Rating after completion | `POST /api/ratings` | `item_ratings`, `product_ratings` | Implemented |

## Notes
- Source of truth for module completion status is `docs/kayan-srs.md` (status column). This matrix maps endpoints/tables and should stay implementation-oriented.
- Legacy follow-up aliases under `/api/followup/*` and `/api/admin/followup-steps*` are deprecated and scheduled for cleanup after transition.
- Auth/Profile remains under existing modules and was not broken by this migration.
- `users.email` was introduced for API identity alignment.
- `/v1` endpoints are still available and should be treated as deprecated during migration.
