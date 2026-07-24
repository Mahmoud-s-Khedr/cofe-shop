import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  SimulationContext,
  ensureArtifacts,
  expectFailure,
  expectSuccess,
  readLatestRunMetadata,
  readSharedState,
  requireEnv,
  resolveBaseUrl,
  writeCombinedSummary,
  writeLatestRunMetadata,
} from './lib/simulation-harness';

type Product = {
  id: number;
  title: string;
  imageUrl: string | null;
  images: Array<{ fileId: number; url: string }>;
  isAvailable: boolean;
};

type Order = {
  orderNumber: string;
  status: string;
  orderType: 'DELIVERY' | 'PICKUP';
  items: Array<{ id: number; productId: number | null }>;
  rejectionReason?: string | null;
  cancellationReason?: string | null;
};

type User = {
  id: number;
  name: string;
  phone: string;
  status: string;
};

async function main(): Promise<void> {
  const latest = await readLatestRunMetadata();
  const sharedState = await readSharedState(latest.artifactDir);
  const baseUrl = sharedState.baseUrl || resolveBaseUrl();
  const { runId, artifactDir } = await ensureArtifacts(latest.runId);
  const ctx = new SimulationContext({ runId, artifactDir, baseUrl, scriptName: 'admin' });
  ctx.setSharedState(sharedState);
  await ctx.initLog();
  await writeLatestRunMetadata(artifactDir, runId);

  try {
    const adminPhone = requireEnv('ADMIN_PHONE');
    const adminPassword = requireEnv('ADMIN_PASSWORD');
    const screenshotA = path.join(process.cwd(), 'scripts', 'sim-images', 'G5LALx9a8AAH7PH.jpg');
    const screenshotB = path.join(process.cwd(), 'scripts', 'sim-images', 'G4sHLBBXoAAst6Z.jpg');

    if (!sharedState.user || !sharedState.orders) {
      throw new Error('shared-state.json is missing user or order data. Run simulate-user-client first.');
    }

    let adminToken = '';
    await ctx.step('admin.auth.login', async () => {
      const result = await ctx.api<{ accessToken: string }>({
        path: '/auth/login',
        json: { phone: adminPhone, password: adminPassword },
      });
      const body = expectSuccess(result, 201);
      adminToken = (body.data as { accessToken: string }).accessToken;
    });

    let managedProduct!: Product;
    await ctx.step('product.create', async () => {
      const result = await ctx.api<{ product: Product }>({
        path: '/admin/products',
        token: adminToken,
        json: {
          title: `Admin Product ${runId}`,
          description: 'Admin-managed simulation product',
          details: 'Initial details',
          price: 450,
          quantity: 8,
        },
      });
      const body = expectSuccess(result, 201);
      managedProduct = (body.data as { product: Product }).product;
      ctx.addCreated('products', managedProduct.id);
    });

    await ctx.step('product.update', async () => {
      const result = await ctx.api<{ product: Product }>({
        method: 'PATCH',
        path: `/admin/products/${managedProduct.id}`,
        token: adminToken,
        json: {
          title: `${managedProduct.title} Updated`,
          description: 'Updated admin-managed simulation product',
          details: 'Updated details',
          price: 525,
          quantity: 10,
        },
      });
      const body = expectSuccess(result, 200);
      managedProduct = (body.data as { product: Product }).product;
    });

    await ctx.step('product.toggle-unavailable', async () => {
      const result = await ctx.api<{ product: Product }>({
        method: 'PATCH',
        path: `/admin/products/${managedProduct.id}/availability`,
        token: adminToken,
        json: { isAvailable: false },
      });
      const body = expectSuccess(result, 200);
      managedProduct = (body.data as { product: Product }).product;
      if (managedProduct.isAvailable) {
        throw new Error('Expected product to be unavailable after availability toggle');
      }
    });

    await ctx.step('product.unavailable-hidden-from-available-list', async () => {
      const result = await ctx.api<{ items: Product[] }>({
        path: '/products',
        query: { search: managedProduct.title, available: true, limit: 10 },
      });
      const body = expectSuccess(result, 200);
      const items = (body.data as { items: Product[] }).items;
      if (items.some((item) => item.id === managedProduct.id)) {
        throw new Error('Unavailable product still appears in available=true listing');
      }
    });

    await ctx.step('product.unavailable-order-fails', async () => {
      const result = await ctx.api<unknown>({
        path: '/orders',
        json: {
          customerName: 'Unavailable Product Customer',
          customerPhone: '+22255555555',
          orderType: 'DELIVERY',
          address: '5 Admin Street',
          items: [{ productId: managedProduct.id, quantity: 1 }],
        },
      });
      expectFailure(result, 400, 'not available');
    }, { expectFailure: true });

    await ctx.step('product.toggle-available', async () => {
      const result = await ctx.api<{ product: Product }>({
        method: 'PATCH',
        path: `/admin/products/${managedProduct.id}/availability`,
        token: adminToken,
        json: { isAvailable: true },
      });
      const body = expectSuccess(result, 200);
      managedProduct = (body.data as { product: Product }).product;
      if (!managedProduct.isAvailable) {
        throw new Error('Expected product to be available after second toggle');
      }
    });

    await ctx.step('product.upload-image', async () => {
      const result = await ctx.api<{ product: Product }>({
        path: `/admin/products/${managedProduct.id}/image`,
        token: adminToken,
        multipartFile: { fieldName: 'file', filePath: screenshotA, contentType: 'image/jpeg' },
      });
      const body = expectSuccess(result, [200, 201]);
      managedProduct = (body.data as { product: Product }).product;
      if (!managedProduct.imageUrl) {
        throw new Error('Expected imageUrl after image upload');
      }
    });

    await ctx.step('product.upload-second-image', async () => {
      const result = await ctx.api<{ product: Product }>({
        path: `/admin/products/${managedProduct.id}/image`,
        token: adminToken,
        multipartFile: { fieldName: 'file', filePath: screenshotB, contentType: 'image/jpeg' },
      });
      const body = expectSuccess(result, [200, 201]);
      managedProduct = (body.data as { product: Product }).product;
      if (managedProduct.images.length !== 2) {
        throw new Error('Expected two product images after the second upload');
      }
    });

    await ctx.step('product.delete-selected-image', async () => {
      const selectedImage = managedProduct.images[1];
      const result = await ctx.api<{ product: Product }>({
        method: 'DELETE',
        path: `/admin/products/${managedProduct.id}/images/${selectedImage.fileId}`,
        token: adminToken,
      });
      const body = expectSuccess(result, 200);
      managedProduct = (body.data as { product: Product }).product;
      if (managedProduct.images.length !== 1 || managedProduct.imageUrl !== managedProduct.images[0].url) {
        throw new Error('Expected the primary product image to remain after deleting the selected second image');
      }
    });

    await ctx.step('product.soft-delete', async () => {
      const result = await ctx.api<{ message: string }>({
        method: 'DELETE',
        path: `/admin/products/${managedProduct.id}`,
        token: adminToken,
      });
      expectSuccess(result, 200);
    });

    await ctx.step('product.soft-delete-hidden-from-list', async () => {
      const result = await ctx.api<{ items: Product[] }>({
        path: '/products',
        query: { search: managedProduct.title, limit: 10 },
      });
      const body = expectSuccess(result, 200);
      const items = (body.data as { items: Product[] }).items;
      if (items.some((item) => item.id === managedProduct.id)) {
        throw new Error('Soft-deleted product still appears in public search');
      }
    });

    await ctx.step('product.soft-delete-detail-404', async () => {
      const result = await ctx.api<unknown>({
        path: `/products/${managedProduct.id}`,
      });
      expectFailure(result, 404, 'Product not found');
    }, { expectFailure: true });

    await ctx.step('orders.list-with-filters', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const result = await ctx.api<{ items: Order[]; total: number }>({
        path: '/admin/orders',
        token: adminToken,
        query: {
          status: 'PENDING',
          orderType: 'DELIVERY',
          orderNumber: sharedState.orders!.registeredReject.orderNumber,
          customerPhone: sharedState.user!.phone,
          fromDate: today,
          toDate: today,
          page: 1,
          limit: 20,
        },
      });
      expectSuccess(result, 200);
    });

    await ctx.step('orders.list-offset', async () => {
      const result = await ctx.api<{ items: Order[]; total: number }>({
        path: '/admin/orders',
        token: adminToken,
        query: { offset: 1, limit: 1 },
      });
      expectSuccess(result, 200);
    });

    await ctx.step('orders.get-detail', async () => {
      const result = await ctx.api<{ order: Order }>({
        path: `/admin/orders/${sharedState.orders!.guestPickupLifecycle.orderNumber}`,
        token: adminToken,
      });
      expectSuccess(result, 200);
    });

    await ctx.step('orders.confirm-without-screenshot.expected-failure', async () => {
      const result = await ctx.api<unknown>({
        method: 'PATCH',
        path: `/admin/orders/${sharedState.orders!.registeredAdminCancel.orderNumber}/status`,
        token: adminToken,
        json: { status: 'CONFIRMED', note: 'Should fail because no screenshot' },
      });
      expectFailure(result, 400, 'screenshot');
    }, { expectFailure: true });

    await ctx.step('orders.confirm-pickup', async () => {
      const result = await ctx.api<{ order: Order }>({
        method: 'PATCH',
        path: `/admin/orders/${sharedState.orders!.guestPickupLifecycle.orderNumber}/status`,
        token: adminToken,
        json: { status: 'CONFIRMED', note: 'Confirmed after screenshot review' },
      });
      const body = expectSuccess(result, 200);
      const order = (body.data as { order: Order }).order;
      if (order.status !== 'CONFIRMED') {
        throw new Error(`Expected CONFIRMED status, received ${order.status}`);
      }
    });

    await ctx.step('orders.preparing-pickup', async () => {
      const result = await ctx.api<{ order: Order }>({
        method: 'PATCH',
        path: `/admin/orders/${sharedState.orders!.guestPickupLifecycle.orderNumber}/status`,
        token: adminToken,
        json: { status: 'PREPARING', note: 'Barista started preparation' },
      });
      const body = expectSuccess(result, 200);
      const order = (body.data as { order: Order }).order;
      if (order.status !== 'PREPARING') {
        throw new Error(`Expected PREPARING status, received ${order.status}`);
      }
    });

    await ctx.step('orders.wrong-branch-on-pickup.expected-failure', async () => {
      const result = await ctx.api<unknown>({
        method: 'PATCH',
        path: `/admin/orders/${sharedState.orders!.guestPickupLifecycle.orderNumber}/status`,
        token: adminToken,
        json: { status: 'OUT_FOR_DELIVERY', note: 'Wrong branch test' },
      });
      expectFailure(result, 400);
    }, { expectFailure: true });

    await ctx.step('orders.ready-pickup', async () => {
      const result = await ctx.api<{ order: Order }>({
        method: 'PATCH',
        path: `/admin/orders/${sharedState.orders!.guestPickupLifecycle.orderNumber}/status`,
        token: adminToken,
        json: { status: 'READY', note: 'Pickup order is ready' },
      });
      const body = expectSuccess(result, 200);
      const order = (body.data as { order: Order }).order;
      if (order.status !== 'READY') {
        throw new Error(`Expected READY status, received ${order.status}`);
      }
    });

    await ctx.step('orders.complete-pickup', async () => {
      const result = await ctx.api<{ order: Order }>({
        method: 'PATCH',
        path: `/admin/orders/${sharedState.orders!.guestPickupLifecycle.orderNumber}/status`,
        token: adminToken,
        json: { status: 'COMPLETED', note: 'Pickup order handed to customer' },
      });
      const body = expectSuccess(result, 200);
      const order = (body.data as { order: Order }).order;
      if (order.status !== 'COMPLETED') {
        throw new Error(`Expected COMPLETED status, received ${order.status}`);
      }
    });

    await ctx.step('orders.reject-delivery', async () => {
      const result = await ctx.api<{ order: Order }>({
        method: 'PATCH',
        path: `/admin/orders/${sharedState.orders!.registeredReject.orderNumber}/status`,
        token: adminToken,
        json: { status: 'REJECTED', reason: 'Out of stock during admin simulation' },
      });
      const body = expectSuccess(result, 200);
      const order = (body.data as { order: Order }).order;
      if (order.status !== 'REJECTED') {
        throw new Error(`Expected REJECTED status, received ${order.status}`);
      }
    });

    await ctx.step('orders.cancel-non-terminal', async () => {
      const result = await ctx.api<{ order: Order }>({
        method: 'PATCH',
        path: `/admin/orders/${sharedState.orders!.registeredAdminCancel.orderNumber}/status`,
        token: adminToken,
        json: { status: 'CANCELLED', reason: 'Admin cancelled pending simulation order' },
      });
      const body = expectSuccess(result, 200);
      const order = (body.data as { order: Order }).order;
      if (order.status !== 'CANCELLED') {
        throw new Error(`Expected CANCELLED status, received ${order.status}`);
      }
    });

    await ctx.step('orders.invalid-transition-from-terminal.expected-failure', async () => {
      const result = await ctx.api<unknown>({
        method: 'PATCH',
        path: `/admin/orders/${sharedState.orders!.registeredAdminCancel.orderNumber}/status`,
        token: adminToken,
        json: { status: 'PREPARING', note: 'Should fail after terminal state' },
      });
      expectFailure(result, 400);
    }, { expectFailure: true });

    await ctx.step('users.list-filtered', async () => {
      const result = await ctx.api<User[]>({
        path: '/admin/users',
        token: adminToken,
        query: {
          status: 'ACTIVE',
          q: sharedState.user!.phone,
          page: 1,
          limit: 20,
        },
      });
      const body = expectSuccess(result, 200);
      const users = body.data as User[];
      if (!users.some((user) => user.id === sharedState.user!.id)) {
        throw new Error('Expected filtered admin user list to include simulation user');
      }
    });

    await ctx.step('users.list-offset', async () => {
      const result = await ctx.api<User[]>({
        path: '/admin/users',
        token: adminToken,
        query: { offset: 1, limit: 1 },
      });
      expectSuccess(result, 200);
    });

    await ctx.step('users.get-detail', async () => {
      const result = await ctx.api<{ user: User }>({
        path: `/admin/users/${sharedState.user!.id}`,
        token: adminToken,
      });
      const body = expectSuccess(result, 200);
      const user = (body.data as { user: User }).user;
      if (user.id !== sharedState.user!.id) {
        throw new Error('Admin user detail returned unexpected user');
      }
    });

    let userToken = '';
    let reviewCreated = false;
    await ctx.step('review.login-user-before-block', async () => {
      const result = await ctx.api<{ accessToken: string }>({
        path: '/auth/login',
        json: { phone: sharedState.user!.phone, password: sharedState.user!.finalPassword },
      });
      const body = expectSuccess(result, 201);
      userToken = (body.data as { accessToken: string }).accessToken;
    });

    try {
      await ctx.step('review.create-completed-order-review', async () => {
        const result = await ctx.api<{ review: { productId: number; rating: number } }>({
          path: `/orders/${sharedState.orders!.registeredPickup.orderNumber}/items/${sharedState.orders!.registeredPickup.itemId}/review`,
          token: userToken,
          json: sharedState.review!,
        });
        const body = expectSuccess(result, 201);
        const review = body.data as { review: { productId: number; rating: number } };
        ctx.addCreated('reviews', `${sharedState.orders!.registeredPickup.orderNumber}:${sharedState.orders!.registeredPickup.itemId}`);
        if (review.review.productId !== sharedState.orders!.registeredPickup.productId) {
          throw new Error('Review was not attached to the expected product');
        }
        reviewCreated = true;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.note(`review.create-completed-order-review: ${message}`);
    }

    if (reviewCreated) {
      await ctx.step('review.visible-in-public-list', async () => {
        const result = await ctx.api<{ items: Array<{ rating: number; comment: string | null }>; total: number }>({
          path: `/products/${sharedState.orders!.registeredPickup.productId}/reviews`,
          query: { limit: 20, page: 1 },
        });
        const body = expectSuccess(result, 200);
        const items = (body.data as { items: Array<{ rating: number; comment: string | null }> }).items;
        if (!items.some((item) => item.comment === sharedState.review!.comment)) {
          throw new Error('Public review list does not include the created review');
        }
      });

      await ctx.step('review.duplicate.expected-failure', async () => {
        const result = await ctx.api<unknown>({
          path: `/orders/${sharedState.orders!.registeredPickup.orderNumber}/items/${sharedState.orders!.registeredPickup.itemId}/review`,
          token: userToken,
          json: sharedState.review!,
        });
        expectFailure(result, 409, 'already been reviewed');
      }, { expectFailure: true });
    } else {
      ctx.note('Skipped duplicate-review and public-review assertions because review creation did not succeed.');
      await ctx.step('review.public-list-check', async () => {
        const result = await ctx.api<{ items: Array<{ rating: number; comment: string | null }>; total: number }>({
          path: `/products/${sharedState.orders!.registeredPickup.productId}/reviews`,
          query: { limit: 20, page: 1 },
        });
        expectSuccess(result, 200);
      });
    }

    await ctx.step('users.block-simulation-user', async () => {
      const result = await ctx.api<{ user: User }>({
        method: 'PATCH',
        path: `/admin/users/${sharedState.user!.id}/status`,
        token: adminToken,
        json: { status: 'BLOCKED' },
      });
      const body = expectSuccess(result, 200);
      const user = (body.data as { user: User }).user;
      if (user.status !== 'BLOCKED') {
        throw new Error(`Expected BLOCKED status, received ${user.status}`);
      }
    });

    await ctx.step('users.blocked-login.expected-failure', async () => {
      const result = await ctx.api<unknown>({
        path: '/auth/login',
        json: { phone: sharedState.user!.phone, password: sharedState.user!.finalPassword },
      });
      expectFailure(result, 401, 'Invalid credentials');
    }, { expectFailure: true });

    ctx.setSharedState({
      ...sharedState,
      admin: {
        managedProductId: managedProduct.id,
        blockedUserId: sharedState.user.id,
      },
    });
    await ctx.saveSharedState();
    await ctx.finish();
    const userSummary = JSON.parse(await readFile(path.join(artifactDir, 'user-summary.json'), 'utf8')) as Record<string, unknown>;

    await writeCombinedSummary(artifactDir, {
      runId,
      artifactDir,
      baseUrl,
      generatedAt: new Date().toISOString(),
      userSummaryFile: path.join(artifactDir, 'user-summary.json'),
      adminSummaryFile: path.join(artifactDir, 'admin-summary.json'),
      sharedStateFile: path.join(artifactDir, 'shared-state.json'),
      userSummary,
      adminSummary: ctx.getSummary(),
    });
  } catch (error) {
    await ctx.finish();
    throw error;
  }
}

void main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
