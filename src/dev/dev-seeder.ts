import { PoolClient } from 'pg';
import { ProductCategory } from '../products/product-category.enum';

export type DevSeedInput = Record<string, never>;

export type DevSeedSummary = {
  productsCreated: number;
};

const DEMO_PRODUCTS: Array<{ category: ProductCategory; title: string; description: string; price: number; quantity: number | null }> = [
  { category: ProductCategory.coffee, title: 'Espresso', description: 'Single shot of rich espresso', price: 150, quantity: null },
  { category: ProductCategory.coffee, title: 'Cappuccino', description: 'Espresso with steamed milk foam', price: 250, quantity: null },
  { category: ProductCategory.breakfast, title: 'Croissant', description: 'Buttery, flaky pastry', price: 200, quantity: 30 },
];

export function parseDevSeedInput(): DevSeedInput {
  return {};
}

/** Seeds a small demo product catalogue for local development. Idempotent by title. */
export async function runDevSeed(client: Pick<PoolClient, 'query'>): Promise<DevSeedSummary> {
  let productsCreated = 0;

  for (const product of DEMO_PRODUCTS) {
    const existing = await client.query('SELECT id FROM products WHERE title = $1', [product.title]);
    if (existing.rowCount) {
      continue;
    }

    await client.query(
      `INSERT INTO products (category, title, description, price, quantity) VALUES ($1, $2, $3, $4, $5)`,
      [product.category, product.title, product.description, product.price, product.quantity],
    );
    productsCreated += 1;
  }

  return { productsCreated };
}
