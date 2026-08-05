import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UploadApiResponse } from 'cloudinary';
import { DatabaseService } from '../database/database.service';
import { CLOUDINARY, CloudinaryInstance } from './cloudinary.provider';
import { validateImageUpload } from './image-validation';

export type UploadedFile = {
  fileId: number;
  url: string;
};

export type CloudinaryFolder = 'bw-cafe/products' | 'bw-cafe/orders';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(CLOUDINARY) private readonly cloudinary: CloudinaryInstance,
  ) {}

  async uploadImage(
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    folder: CloudinaryFolder,
  ): Promise<UploadedFile> {
    validateImageUpload(file);

    const uploadResult = await this.uploadBuffer(file.buffer, folder);

    try {
      const insert = await this.databaseService.query<{ id: number }>(
        `INSERT INTO files (
            asset_id, public_id, url, resource_type, format, size_bytes,
            width, height, original_name, mime_type
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          uploadResult.asset_id,
          uploadResult.public_id,
          uploadResult.secure_url,
          uploadResult.resource_type,
          uploadResult.format ?? null,
          uploadResult.bytes,
          uploadResult.width ?? null,
          uploadResult.height ?? null,
          file.originalname,
          file.mimetype,
        ],
      );

      return { fileId: insert.rows[0].id, url: uploadResult.secure_url };
    } catch (error) {
      await this.destroyCloudinaryAsset(uploadResult.public_id, uploadResult.resource_type);
      throw error;
    }
  }

  async deleteFile(fileId: number): Promise<void> {
    const query = await this.databaseService.query<{ public_id: string; resource_type: string; is_order_snapshot: boolean }>(
      `SELECT public_id, resource_type,
              EXISTS (SELECT 1 FROM order_item_images WHERE file_id = files.id) AS "isOrderSnapshot"
       FROM files WHERE id = $1`,
      [fileId],
    );

    if (!query.rowCount) {
      throw new NotFoundException('File not found');
    }

    const { public_id: publicId, resource_type: resourceType, is_order_snapshot: isOrderSnapshot } = query.rows[0];
    if (isOrderSnapshot) {
      return;
    }

    const destroyed = await this.destroyCloudinaryAsset(publicId, resourceType);
    if (destroyed) {
      await this.databaseService.query('DELETE FROM files WHERE id = $1', [fileId]);
    }
    // If Cloudinary deletion failed, the File row is left in place (now orphaned,
    // since the caller has already detached it) for the cleanup job to retry.
  }

  /** Finds File rows attached to neither a product nor an order — candidates for cleanup. */
  async findOrphanFileIds(): Promise<number[]> {
    const result = await this.databaseService.query<{ id: number }>(
      `SELECT f.id
       FROM files f
       LEFT JOIN products p ON p.image_file_id = f.id
       LEFT JOIN product_images pi ON pi.file_id = f.id
       LEFT JOIN orders o ON o.screenshot_file_id = f.id
       LEFT JOIN order_item_images oii ON oii.file_id = f.id
       WHERE p.id IS NULL AND pi.id IS NULL AND o.id IS NULL AND oii.id IS NULL`,
    );
    return result.rows.map((row) => row.id);
  }

  private uploadBuffer(buffer: Buffer, folder: CloudinaryFolder): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary upload failed'));
            return;
          }
          resolve(result);
        },
      );
      uploadStream.end(buffer);
    });
  }

  private async destroyCloudinaryAsset(publicId: string, resourceType: string): Promise<boolean> {
    try {
      await this.cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true,
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to delete Cloudinary asset ${publicId}: ${message}`);
      return false;
    }
  }
}
