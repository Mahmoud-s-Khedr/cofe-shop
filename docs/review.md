# System Review Findings

## Findings

### 1. High: login contract drift breaks internal tooling and creates false confidence around auth coverage

The public login API accepts email only, but multiple internal flows still try to authenticate with `phone`. The backend DTO and query only support `email`, so these callers will fail once they hit the current API contract instead of an older deployment shape.

References:

- [src/auth/dto/login.dto.ts](/home/mk/Projects/freelance/mohand/kayan/kayan-place/src/auth/dto/login.dto.ts:4)
- [src/auth/auth.service.ts](/home/mk/Projects/freelance/mohand/kayan/kayan-place/src/auth/auth.service.ts:171)
- [src/dev/dev-seeder.ts](/home/mk/Projects/freelance/mohand/kayan/kayan-place/src/dev/dev-seeder.ts:658)
- [src/dev/dev-seeder.ts](/home/mk/Projects/freelance/mohand/kayan/kayan-place/src/dev/dev-seeder.ts:688)
- [scripts/lib/kayan-faults-test-harness.ts](/home/mk/Projects/freelance/mohand/kayan/kayan-place/scripts/lib/kayan-faults-test-harness.ts:373)
- [scripts/lib/kayan-gallery-test-harness.ts](/home/mk/Projects/freelance/mohand/kayan/kayan-place/scripts/lib/kayan-gallery-test-harness.ts:274)

Impact:

- dev seeding can fail even when the API is healthy
- simulation harnesses can report auth regressions that are really just contract drift
- fallback logic around phone login hides the fact that the test suite is no longer exercising the real supported interface consistently

Recommendation:

- remove phone-based login attempts from seeders and harnesses
- keep all auth tooling aligned to the email-only contract unless phone login is intentionally reintroduced in the API

### 2. High: product and gallery asset attachment lacks validation, allowing arbitrary or not-yet-uploaded files to be linked

Fault asset association validates existence, upload status, purpose, and image MIME type before linking files. Product and gallery asset association do not perform equivalent checks; they blindly delete and insert file links. That means an admin can attach another user’s file, a pending file, or a non-image file as a gallery image or product image/file reference.

References:

- [src/kayan/kayan.service.ts](/home/mk/Projects/freelance/mohand/kayan/kayan-place/src/kayan/kayan.service.ts:1101)
- [src/kayan/kayan.service.ts](/home/mk/Projects/freelance/mohand/kayan/kayan-place/src/kayan/kayan.service.ts:1193)
- [src/kayan/kayan.service.ts](/home/mk/Projects/freelance/mohand/kayan/kayan-place/src/kayan/kayan.service.ts:1175)

Impact:

- broken media references can be persisted
- unauthorized file reuse across entities is possible
- frontend can render incomplete or invalid assets because the backend accepted a bad link at write time

Recommendation:

- apply validation comparable to `assertValidFaultImageFiles` for product/gallery asset writes
- enforce file ownership or admin-safe ownership rules, upload status, and purpose/MIME compatibility per asset type

### 3. High: admin order and service status updates do not enforce legal state transitions

Faults have an explicit transition matrix, but orders and services only validate the target enum value. Admins can move records backwards or into nonsensical states, which undermines follow-up logic, ratings eligibility, and operational reporting.

References:

- [src/kayan/kayan.service.ts](/home/mk/Projects/freelance/mohand/kayan/kayan-place/src/kayan/kayan.service.ts:350)
- [src/kayan/kayan.service.ts](/home/mk/Projects/freelance/mohand/kayan/kayan-place/src/kayan/kayan.service.ts:602)
- [src/kayan/kayan.service.ts](/home/mk/Projects/freelance/mohand/kayan/kayan-place/src/kayan/kayan.service.ts:1132)

Impact:

- delivered orders can be moved back to in-progress states
- finished services can be cancelled or reopened
- status history becomes operationally misleading because impossible transitions are recorded as valid events

Recommendation:

- add explicit transition validation for orders and services, matching the stricter fault model
- reject no-op or regressive transitions unless there is a documented recovery workflow

### 4. Medium: profile API claims nullable clears for `avatarFileId` and `contactInfo`, but DTO validation blocks those requests

The profile DTO documents `avatarFileId` and `contactInfo` as nullable, and the service contains SQL intended to clear them when they are present as `null`. However, the DTO decorators require `avatarFileId` to be a number and `contactInfo` to be a non-empty string whenever the key is present, so `null` will fail validation before the service can apply the clear behavior.

References:

- [src/users/dto/update-profile.dto.ts](/home/mk/Projects/freelance/mohand/kayan/kayan-place/src/users/dto/update-profile.dto.ts:11)
- [src/users/dto/update-profile.dto.ts](/home/mk/Projects/freelance/mohand/kayan/kayan-place/src/users/dto/update-profile.dto.ts:16)
- [src/users/users.service.ts](/home/mk/Projects/freelance/mohand/kayan/kayan-place/src/users/users.service.ts:175)
- [src/users/users.service.ts](/home/mk/Projects/freelance/mohand/kayan/kayan-place/src/users/users.service.ts:217)

Impact:

- frontend cannot clear avatar/contact info despite API docs and service intent implying it should work
- this produces contract confusion and forces client-side workarounds

Recommendation:

- either support `null` explicitly in validation, or remove nullable behavior from the contract and service path

### 5. Medium: admin/gallery create and update accept image IDs without verifying that they are image assets

The upload-intent DTO allows many MIME types and purposes, and gallery write paths currently accept any `imageFileIds` array without verifying the referenced files are uploaded images. This is narrower than Finding 2 and affects the visible public gallery directly.

References:

- [src/files/dto/create-upload-intent.dto.ts](/home/mk/Projects/freelance/mohand/kayan/kayan-place/src/files/dto/create-upload-intent.dto.ts:15)
- [src/files/dto/create-upload-intent.dto.ts](/home/mk/Projects/freelance/mohand/kayan/kayan-place/src/files/dto/create-upload-intent.dto.ts:24)
- [src/kayan/kayan.service.ts](/home/mk/Projects/freelance/mohand/kayan/kayan-place/src/kayan/kayan.service.ts:653)
- [src/kayan/kayan.service.ts](/home/mk/Projects/freelance/mohand/kayan/kayan-place/src/kayan/kayan.service.ts:668)
- [src/kayan/kayan.service.ts](/home/mk/Projects/freelance/mohand/kayan/kayan-place/src/kayan/kayan.service.ts:1193)

Impact:

- gallery pages can end up referencing documents, pending files, or invalid assets
- public-facing content quality depends entirely on client discipline instead of server guarantees

Recommendation:

- validate that gallery `imageFileIds` reference uploaded image-compatible files before persisting them

## Residual Risks

- The review focused on backend behavior, transport contracts, and integration-critical paths. It did not include a full database migration audit or load/performance analysis.
- Several documentation mismatches were already corrected in the integration guides, but tooling and runtime contract enforcement still need code changes to remove the underlying drift.

## Verification Notes

- Findings were derived from current source, DTOs, service logic, and simulation harnesses.
- No runtime tests were executed as part of this review write-up.
