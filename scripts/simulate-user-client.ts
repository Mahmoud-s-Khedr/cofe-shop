import path from 'node:path';
import {
  SimulationContext,
  ensureArtifacts,
  expectFailure,
  expectSuccess,
  requireEnv,
  resolveBaseUrl,
  writeLatestRunMetadata,
} from './lib/simulation-harness';

type Product = {
  id: number;
  title: string;
  price: number;
};

type AuthUser = {
  id: number;
  name: string;
  phone: string;
  role: string;
  status: string;
};

type Order = {
  id: number;
  orderNumber: string;
  orderType: 'DELIVERY' | 'PICKUP';
  status: string;
  screenshotUrl: string | null;
  items: Array<{ id: number; productId: number | null; quantity: number }>;
  guestAccessToken?: string;
};

async function main(): Promise<void> {
  const baseUrl = resolveBaseUrl();
  const { runId, artifactDir } = await ensureArtifacts();
  const ctx = new SimulationContext({ runId, artifactDir, baseUrl, scriptName: 'user' });
  await ctx.initLog();
  await writeLatestRunMetadata(artifactDir, runId);

  try {
    const adminPhone = requireEnv('ADMIN_PHONE');
    const adminPassword = requireEnv('ADMIN_PASSWORD');
    const uniqueSuffix = runId.replace(/[^0-9TZ-]/g, '').slice(-12);
    const userPhone = `+2221${uniqueSuffix.replace(/\D/g, '').slice(-8).padStart(8, '0')}`;
    const initialPassword = 'SimUser123';
    const resetPassword = 'SimReset123';
    const finalPassword = 'SimFinal123';
    const baseName = `Sim User ${runId.slice(-6)}`;
    const updatedName = `${baseName} Updated`;
    const review = { rating: 5, comment: `Simulation review ${runId}` };
    const screenshotFile = path.join(process.cwd(), 'scripts', 'sim-images', 'G5LDVlJWQAANOhJ.jpg');
    const continueOnFailure = async (name: string, run: () => Promise<void>, options?: { expectFailure?: boolean }) => {
      try {
        await ctx.step(name, run, options);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ctx.note(`${name}: ${message}`);
      }
    };

    ctx.note('User simulation includes an admin bootstrap phase to create deterministic products for checkout.');
    ctx.getSharedState().review = review;

    let adminToken = '';
    await ctx.step('bootstrap.admin.login', async () => {
      const result = await ctx.api<{
        accessToken: string;
      }>({
        path: '/auth/login',
        json: { phone: adminPhone, password: adminPassword },
      });
      const body = expectSuccess(result, 201);
      adminToken = (body.data as { accessToken: string }).accessToken;
    });

    const bootstrapProducts: Product[] = [];
    for (const [index, title] of [`Sim Espresso ${runId}`, `Sim Mocha ${runId}`].entries()) {
      await ctx.step(`bootstrap.product.${index + 1}.create`, async () => {
        const result = await ctx.api<{ product: Product }>({
          path: '/admin/products',
          token: adminToken,
          json: {
            category: 'coffee',
            title,
            description: `Bootstrap product ${index + 1}`,
            details: 'Client simulation bootstrap',
            price: 200 + index * 75,
            quantity: 25,
          },
        });
        const body = expectSuccess(result, 201);
        const product = (body.data as { product: Product }).product;
        bootstrapProducts.push(product);
        ctx.addCreated('products', product.id);
      });
    }

    ctx.getSharedState().bootstrap = {
      adminPhone,
      productIds: bootstrapProducts.map((product) => product.id),
      productTitles: bootstrapProducts.map((product) => product.title),
    };
    await ctx.saveSharedState();

    await ctx.step('browse.products.zero-result-search', async () => {
      const result = await ctx.api<{ items: Product[]; total: number }>({
        path: '/products',
        query: { search: `no-match-${runId}`, available: true, limit: 5 },
      });
      const body = expectSuccess(result, 200);
      const data = body.data as { items: Product[]; total: number };
      if (data.total !== 0) {
        throw new Error(`Expected empty result set, received total=${data.total}`);
      }
    });

    await ctx.step('browse.products.filtered-list', async () => {
      const result = await ctx.api<{ items: Product[]; total: number }>({
        path: '/products',
        query: {
          search: 'Sim',
          available: true,
          minPrice: 100,
          maxPrice: 1000,
          sort: 'price_asc',
          page: 1,
          limit: 10,
        },
      });
      const body = expectSuccess(result, 200);
      const data = body.data as { items: Product[]; total: number };
      if (data.items.length < 2) {
        throw new Error('Expected at least two bootstrap products in filtered list');
      }
    });

    await ctx.step('browse.products.offset-list', async () => {
      const result = await ctx.api<{ items: Product[]; total: number }>({
        path: '/products',
        query: { offset: 1, limit: 1, sort: 'price_desc' },
      });
      expectSuccess(result, 200);
    });

    await ctx.step('browse.product.detail', async () => {
      const result = await ctx.api<{ product: Product }>({
        path: `/products/${bootstrapProducts[0].id}`,
      });
      const body = expectSuccess(result, 200);
      const product = (body.data as { product: Product }).product;
      if (product.id !== bootstrapProducts[0].id) {
        throw new Error('Product detail returned unexpected product id');
      }
    });

    await ctx.step('browse.product.reviews.empty', async () => {
      const result = await ctx.api<{ items: unknown[]; total: number }>({
        path: `/products/${bootstrapProducts[0].id}/reviews`,
        query: { page: 1, limit: 5, offset: 0 },
      });
      expectSuccess(result, 200);
    });

    await ctx.step('auth.register', async () => {
      const result = await ctx.api<{ message: string; code?: string }>({
        path: '/auth/register',
        json: { name: baseName, phone: userPhone, password: initialPassword },
      });
      const body = expectSuccess(result, 201);
      const data = body.data as { message: string; code?: string };
      if (data.code !== '000000') {
        throw new Error(`Expected OTP code 000000, received ${data.code ?? 'none'}`);
      }
    });

    await ctx.step('auth.resend-registration-code', async () => {
      const result = await ctx.api<{ code?: string }>({
        path: '/auth/resend-registration-code',
        json: { phone: userPhone },
      });
      const body = expectSuccess(result, 201);
      const data = body.data as { code?: string };
      if (data.code !== '000000') {
        throw new Error('Expected resend OTP to return 000000');
      }
    });

    let currentAccessToken = '';
    let currentRefreshToken = '';
    let createdUser: AuthUser | undefined;

    await ctx.step('auth.verify-registration', async () => {
      const result = await ctx.api<{
        user: AuthUser;
        accessToken: string;
        refreshToken: string;
      }>({
        path: '/auth/verify-registration',
        json: { phone: userPhone, code: '000000' },
      });
      const body = expectSuccess(result, 201);
      const data = body.data as { user: AuthUser; accessToken: string; refreshToken: string };
      currentAccessToken = data.accessToken;
      currentRefreshToken = data.refreshToken;
      createdUser = data.user;
      ctx.addCreated('users', data.user.id);
    });

    await ctx.step('auth.login.initial-password', async () => {
      const result = await ctx.api<{
        user: AuthUser;
        accessToken: string;
        refreshToken: string;
      }>({
        path: '/auth/login',
        json: { phone: userPhone, password: initialPassword },
      });
      const body = expectSuccess(result, 201);
      const data = body.data as { user: AuthUser; accessToken: string; refreshToken: string };
      currentAccessToken = data.accessToken;
      currentRefreshToken = data.refreshToken;
    });

    await ctx.step('auth.refresh', async () => {
      const result = await ctx.api<{ accessToken: string; refreshToken: string }>({
        path: '/auth/refresh',
        json: { refreshToken: currentRefreshToken },
      });
      const body = expectSuccess(result, 201);
      const data = body.data as { accessToken: string; refreshToken: string };
      currentAccessToken = data.accessToken;
      currentRefreshToken = data.refreshToken;
    });

    await ctx.step('auth.logout', async () => {
      const result = await ctx.api<Record<string, never>>({
        path: '/auth/logout',
        token: currentAccessToken,
        json: { refreshToken: currentRefreshToken },
      });
      expectSuccess(result, 201);
    });

    await ctx.step('auth.login.after-logout', async () => {
      const result = await ctx.api<{
        accessToken: string;
        refreshToken: string;
      }>({
        path: '/auth/login',
        json: { phone: userPhone, password: initialPassword },
      });
      const body = expectSuccess(result, 201);
      const data = body.data as { accessToken: string; refreshToken: string };
      currentAccessToken = data.accessToken;
      currentRefreshToken = data.refreshToken;
    });

    await ctx.step('auth.forgot-password', async () => {
      const result = await ctx.api<{ message: string; code?: string }>({
        path: '/auth/forgot-password',
        json: { phone: userPhone },
      });
      const body = expectSuccess(result, 201);
      const data = body.data as { message: string; code?: string };
      if (data.code !== '000000') {
        throw new Error('Expected forgot-password OTP to return 000000');
      }
    });

    await ctx.step('auth.reset-password', async () => {
      const result = await ctx.api<{ accessToken: string; refreshToken: string; message: string }>({
        path: '/auth/reset-password',
        json: {
          phone: userPhone,
          code: '000000',
          newPassword: resetPassword,
          confirmPassword: resetPassword,
        },
      });
      const body = expectSuccess(result, 201);
      const data = body.data as { accessToken: string; refreshToken: string };
      currentAccessToken = data.accessToken;
      currentRefreshToken = data.refreshToken;
    });

    await ctx.step('auth.login.after-reset-password', async () => {
      const result = await ctx.api<{
        accessToken: string;
        refreshToken: string;
      }>({
        path: '/auth/login',
        json: { phone: userPhone, password: resetPassword },
      });
      const body = expectSuccess(result, 201);
      const data = body.data as { accessToken: string; refreshToken: string };
      currentAccessToken = data.accessToken;
      currentRefreshToken = data.refreshToken;
    });

    await ctx.step('profile.get-me', async () => {
      const result = await ctx.api<{ user: AuthUser }>({
        path: '/me',
        token: currentAccessToken,
      });
      const body = expectSuccess(result, 200);
      const user = (body.data as { user: AuthUser }).user;
      if (user.phone !== userPhone) {
        throw new Error('GET /me returned a different user');
      }
    });

    await ctx.step('profile.update-me', async () => {
      const result = await ctx.api<{ user: AuthUser }>({
        method: 'PATCH',
        path: '/me',
        token: currentAccessToken,
        json: { name: updatedName },
      });
      const body = expectSuccess(result, 200);
      const user = (body.data as { user: AuthUser }).user;
      if (user.name !== updatedName) {
        throw new Error('PATCH /me did not persist updated name');
      }
    });

    await ctx.step('profile.change-password', async () => {
      const result = await ctx.api<{ message: string }>({
        method: 'PATCH',
        path: '/me/password',
        token: currentAccessToken,
        json: { oldPassword: resetPassword, newPassword: finalPassword },
      });
      expectSuccess(result, 200);
    });

    await ctx.step('auth.login.after-profile-password-change', async () => {
      const result = await ctx.api<{
        accessToken: string;
        refreshToken: string;
      }>({
        path: '/auth/login',
        json: { phone: userPhone, password: finalPassword },
      });
      const body = expectSuccess(result, 201);
      const data = body.data as { accessToken: string; refreshToken: string };
      currentAccessToken = data.accessToken;
      currentRefreshToken = data.refreshToken;
    });

    await ctx.step('orders.invalid-nonexistent-product', async () => {
      const result = await ctx.api<unknown>({
        path: '/orders',
        json: {
          customerName: updatedName,
          customerPhone: userPhone,
          orderType: 'DELIVERY',
          address: 'Missing Product St',
          items: [{ productId: 999999, quantity: 1 }],
        },
      });
      expectFailure(result, 400, 'does not exist');
    }, { expectFailure: true });

    let guestPrimary!: Order;
    await ctx.step('guest-order.create-primary', async () => {
      const result = await ctx.api<{ order: Order }>({
        path: '/orders',
        json: {
          customerName: `Guest ${runId}`,
          customerPhone: `+223${uniqueSuffix.replace(/\D/g, '').slice(-8).padStart(8, '0')}`,
          orderType: 'DELIVERY',
          address: '1 Guest Road',
          customerNotes: 'Deliver at front desk',
          items: [{ productId: bootstrapProducts[0].id, quantity: 1 }],
        },
      });
      const body = expectSuccess(result, 201);
      guestPrimary = (body.data as { order: Order }).order;
      if (!guestPrimary.guestAccessToken) {
        throw new Error('Guest access token missing from guest order creation');
      }
      ctx.addCreated('orders', guestPrimary.orderNumber);
    });

    await ctx.step('guest-order.fetch-primary', async () => {
      const result = await ctx.api<{ order: Order }>({
        path: `/orders/${guestPrimary.orderNumber}`,
        guestToken: guestPrimary.guestAccessToken,
      });
      const body = expectSuccess(result, 200);
      const order = (body.data as { order: Order }).order;
      if (order.orderNumber !== guestPrimary.orderNumber) {
        throw new Error('Guest order fetch returned unexpected order');
      }
    });

    let guestPickupLifecycle!: Order;
    await ctx.step('guest-order.create-pickup-lifecycle', async () => {
      const result = await ctx.api<{ order: Order }>({
        path: '/orders',
        json: {
          customerName: `Guest Pickup ${runId}`,
          customerPhone: `+225${uniqueSuffix.replace(/\D/g, '').slice(-8).padStart(8, '0')}`,
          orderType: 'PICKUP',
          pickupTime: '2026-07-14T11:00:00.000Z',
          items: [{ productId: bootstrapProducts[0].id, quantity: 1 }],
        },
      });
      const body = expectSuccess(result, 201);
      guestPickupLifecycle = (body.data as { order: Order }).order;
      if (!guestPickupLifecycle.guestAccessToken) {
        throw new Error('Guest pickup lifecycle order is missing guestAccessToken');
      }
      ctx.addCreated('orders', guestPickupLifecycle.orderNumber);
    });

    await ctx.step('guest-order.upload-pickup-lifecycle-screenshot', async () => {
      const result = await ctx.api<{ order: Order }>({
        path: `/orders/${guestPickupLifecycle.orderNumber}/screenshot`,
        guestToken: guestPickupLifecycle.guestAccessToken,
        multipartFile: { fieldName: 'file', filePath: screenshotFile, contentType: 'image/jpeg' },
      });
      const body = expectSuccess(result, [200, 201]);
      const order = (body.data as { order: Order }).order;
      if (!order.screenshotUrl) {
        throw new Error('Guest pickup lifecycle order screenshot was not attached');
      }
      guestPickupLifecycle = order;
    });

    await ctx.step('guest-order.upload-screenshot', async () => {
      const result = await ctx.api<{ order: Order }>({
        path: `/orders/${guestPrimary.orderNumber}/screenshot`,
        guestToken: guestPrimary.guestAccessToken,
        multipartFile: { fieldName: 'file', filePath: screenshotFile, contentType: 'image/jpeg' },
      });
      const body = expectSuccess(result, [200, 201]);
      const order = (body.data as { order: Order }).order;
      if (!order.screenshotUrl) {
        throw new Error('Screenshot upload did not attach screenshotUrl');
      }
    });

    let guestCancelled!: Order;
    await ctx.step('guest-order.create-cancel-target', async () => {
      const result = await ctx.api<{ order: Order }>({
        path: '/orders',
        json: {
          customerName: `Guest Cancel ${runId}`,
          customerPhone: `+224${uniqueSuffix.replace(/\D/g, '').slice(-8).padStart(8, '0')}`,
          orderType: 'DELIVERY',
          address: '2 Guest Road',
          items: [{ productId: bootstrapProducts[1].id, quantity: 1 }],
        },
      });
      const body = expectSuccess(result, 201);
      guestCancelled = (body.data as { order: Order }).order;
      if (!guestCancelled.guestAccessToken) {
        throw new Error('Guest cancel order is missing guestAccessToken');
      }
      ctx.addCreated('orders', guestCancelled.orderNumber);
    });

    await ctx.step('guest-order.cancel', async () => {
      const result = await ctx.api<{ order: Order }>({
        method: 'PATCH',
        path: `/orders/${guestCancelled.orderNumber}/cancel`,
        guestToken: guestCancelled.guestAccessToken,
        json: { reason: 'Guest changed mind during simulation' },
      });
      const body = expectSuccess(result, 200);
      const order = (body.data as { order: Order }).order;
      if (order.status !== 'CANCELLED') {
        throw new Error(`Expected guest order to be CANCELLED, received ${order.status}`);
      }
    });

    await ctx.step('guest-order-history.forbidden', async () => {
      const result = await ctx.api<unknown>({
        path: '/me/orders',
        guestToken: guestCancelled.guestAccessToken,
      });
      expectFailure(result, [401, 403]);
    }, { expectFailure: true });

    let registeredPickup!: Order;
    await ctx.step('user-order.create-pickup', async () => {
      const result = await ctx.api<{ order: Order }>({
        path: '/orders',
        token: currentAccessToken,
        json: {
          customerName: updatedName,
          customerPhone: userPhone,
          orderType: 'PICKUP',
          pickupTime: '2026-07-14T10:00:00.000Z',
          items: [{ productId: bootstrapProducts[0].id, quantity: 2 }],
        },
      });
      const body = expectSuccess(result, 201);
      registeredPickup = (body.data as { order: Order }).order;
      ctx.addCreated('orders', registeredPickup.orderNumber);
    });

    ctx.setSharedState({
      ...ctx.getSharedState(),
      user: {
        id: createdUser!.id,
        name: baseName,
        updatedName,
        phone: userPhone,
        password: initialPassword,
        resetPassword,
        finalPassword,
      },
      orders: {
        guestPrimary: {
          orderNumber: guestPrimary.orderNumber,
          guestAccessToken: guestPrimary.guestAccessToken!,
        },
        guestCancelled: {
          orderNumber: guestCancelled.orderNumber,
          guestAccessToken: guestCancelled.guestAccessToken!,
        },
        guestPickupLifecycle: {
          orderNumber: guestPickupLifecycle.orderNumber,
          guestAccessToken: guestPickupLifecycle.guestAccessToken!,
          itemId: guestPickupLifecycle.items[0].id,
          productId: guestPickupLifecycle.items[0].productId!,
        },
        registeredPickup: {
          orderNumber: registeredPickup.orderNumber,
          itemId: registeredPickup.items[0].id,
          productId: registeredPickup.items[0].productId!,
        },
        registeredReject: { orderNumber: '' },
        registeredAdminCancel: { orderNumber: '' },
      },
    });
    await ctx.saveSharedState();

    await continueOnFailure('user-order.upload-pickup-screenshot', async () => {
      const result = await ctx.api<{ order: Order }>({
        path: `/orders/${registeredPickup.orderNumber}/screenshot`,
        token: currentAccessToken,
        multipartFile: { fieldName: 'file', filePath: screenshotFile, contentType: 'image/jpeg' },
      });
      const body = expectSuccess(result, [200, 201]);
      const order = (body.data as { order: Order }).order;
      if (!order.screenshotUrl) {
        throw new Error('Pickup order screenshot was not attached');
      }
      registeredPickup = order;
    });

    await continueOnFailure('user-order.fetch-direct', async () => {
      const result = await ctx.api<{ order: Order }>({
        path: `/orders/${registeredPickup.orderNumber}`,
        token: currentAccessToken,
      });
      expectSuccess(result, 200);
    });

    await continueOnFailure('user-order.fetch-my-order', async () => {
      const result = await ctx.api<{ order: Order }>({
        path: `/me/orders/${registeredPickup.orderNumber}`,
        token: currentAccessToken,
      });
      expectSuccess(result, 200);
    });

    let registeredReject!: Order;
    await ctx.step('user-order.create-reject-target', async () => {
      const result = await ctx.api<{ order: Order }>({
        path: '/orders',
        token: currentAccessToken,
        json: {
          customerName: updatedName,
          customerPhone: userPhone,
          orderType: 'DELIVERY',
          address: '3 User Street',
          items: [{ productId: bootstrapProducts[1].id, quantity: 1 }],
        },
      });
      const body = expectSuccess(result, 201);
      registeredReject = (body.data as { order: Order }).order;
      ctx.addCreated('orders', registeredReject.orderNumber);
    });

    let registeredAdminCancel!: Order;
    await ctx.step('user-order.create-admin-cancel-target', async () => {
      const result = await ctx.api<{ order: Order }>({
        path: '/orders',
        token: currentAccessToken,
        json: {
          customerName: updatedName,
          customerPhone: userPhone,
          orderType: 'DELIVERY',
          address: '4 User Street',
          customerNotes: 'Keep pending for admin tests',
          items: [{ productId: bootstrapProducts[0].id, quantity: 1 }],
        },
      });
      const body = expectSuccess(result, 201);
      registeredAdminCancel = (body.data as { order: Order }).order;
      ctx.addCreated('orders', registeredAdminCancel.orderNumber);
    });

    ctx.setSharedState({
      ...ctx.getSharedState(),
      orders: {
        ...ctx.getSharedState().orders!,
        registeredReject: {
          orderNumber: registeredReject.orderNumber,
        },
        registeredAdminCancel: {
          orderNumber: registeredAdminCancel.orderNumber,
        },
      },
    });
    await ctx.saveSharedState();

    await ctx.step('user-order.list-history', async () => {
      const result = await ctx.api<{ items: Order[]; total: number }>({
        path: '/me/orders',
        token: currentAccessToken,
        query: { page: 1, limit: 10, offset: 0 },
      });
      const body = expectSuccess(result, 200);
      const data = body.data as { items: Order[]; total: number };
      if (data.total < 3) {
        throw new Error(`Expected at least 3 registered orders, received ${data.total}`);
      }
    });

    await ctx.step('reviews.before-completion.expected-failure', async () => {
      const result = await ctx.api<unknown>({
        path: `/orders/${registeredPickup.orderNumber}/items/${registeredPickup.items[0].id}/review`,
        token: currentAccessToken,
        json: review,
      });
      expectFailure(result, [400, 403]);
    }, { expectFailure: true });
    await ctx.finish();
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
