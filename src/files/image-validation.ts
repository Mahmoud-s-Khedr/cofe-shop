import { BadRequestException } from '@nestjs/common';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const MAGIC_BYTE_CHECKS: Array<{ mimeType: string; signature: number[] }> = [
  { mimeType: 'image/jpeg', signature: [0xff, 0xd8, 0xff] },
  { mimeType: 'image/png', signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
];

function matchesSignature(buffer: Buffer, signature: number[]): boolean {
  if (buffer.length < signature.length) return false;
  return signature.every((byte, index) => buffer[index] === byte);
}

function isWebp(buffer: Buffer): boolean {
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  );
}

export function validateImageUpload(file: {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}): void {
  if (!file || !file.buffer || file.buffer.length === 0) {
    throw new BadRequestException('Image file is required');
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new BadRequestException('Image exceeds the maximum allowed size of 5MB');
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new BadRequestException('Only JPEG, PNG, and WEBP images are allowed');
  }

  const extension = extractExtension(file.originalname);
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new BadRequestException('File extension is not allowed');
  }

  const matchesKnownSignature =
    MAGIC_BYTE_CHECKS.some((check) => check.mimeType === file.mimetype && matchesSignature(file.buffer, check.signature)) ||
    (file.mimetype === 'image/webp' && isWebp(file.buffer));

  if (!matchesKnownSignature) {
    throw new BadRequestException('File content does not match the declared image type');
  }
}

function extractExtension(filename: string): string {
  const match = /\.[^.]+$/.exec(filename.toLowerCase());
  return match ? match[0] : '';
}
