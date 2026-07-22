# V1 Deprecation Notes (Marketplace -> Kayan API)

## Deprecated business endpoints

These v1 flows are now legacy and should be replaced by `/api` Kayan flows:

- User listing lifecycle as primary business model:
  - `POST /products`, `PATCH /products/:id`, `PATCH /products/:id/status`, `GET /my/products`
- User-to-user moderation social flows:
  - `/favorites/*`
  - `/blocks/*`
  - `/reports/*` (user abuse reports)
  - `/ratings/*` (user-to-user rating)
- Legacy chat tied to peer marketplace browsing:
  - `/chat/*` for non-followup item communication

## V2 replacements

- Catalog + ordering: `/api/products`, `/api/orders`, `/api/admin/orders`
- Faults: `/api/faults`, `/api/admin/faults`
- Services: `/api/services`, `/api/admin/services`
- Follow-up steps: `/api/followups/:itemType/:itemId/steps`, `/api/admin/followups/:itemType/:itemId/steps*`
- Item chat: `/api/followups/:itemType/:itemId/chat/*`
- Gallery: `/api/gallery`, `/api/admin/gallery`
- Completion-based item ratings: `/api/ratings`

## Migration behavior

- Old endpoints are not removed in this commit to avoid immediate client breakage.
- New development must use `/api` endpoints only.
- Old endpoint removal can be done in a dedicated cleanup release after frontend migration.
