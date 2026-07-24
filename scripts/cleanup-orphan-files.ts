import { v2 as cloudinary } from 'cloudinary';
import { Pool } from 'pg';

/**
 * Deletes `File` rows attached to neither a product nor an order (e.g. left
 * behind by a failed upload-replacement sequence) along with their Cloudinary
 * assets. Safe to run repeatedly on a schedule.
 */
async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const orphans = await pool.query<{ id: number; public_id: string; resource_type: string }>(
      `SELECT f.id, f.public_id, f.resource_type
       FROM files f
       LEFT JOIN products p ON p.image_file_id = f.id
       LEFT JOIN product_images pi ON pi.file_id = f.id
       LEFT JOIN orders o ON o.screenshot_file_id = f.id
       WHERE p.id IS NULL AND pi.id IS NULL AND o.id IS NULL`,
    );

    console.log(`Found ${orphans.rowCount ?? 0} orphan file(s)`);

    for (const file of orphans.rows) {
      try {
        await cloudinary.uploader.destroy(file.public_id, { resource_type: file.resource_type, invalidate: true });
        await pool.query('DELETE FROM files WHERE id = $1', [file.id]);
        console.log(`Deleted orphan file ${file.id} (${file.public_id})`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Failed to delete orphan file ${file.id}: ${message}`);
      }
    }
  } finally {
    await pool.end();
  }
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Orphan file cleanup failed: ${message}`);
  process.exit(1);
});
