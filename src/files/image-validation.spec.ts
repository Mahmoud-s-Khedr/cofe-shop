import { BadRequestException } from '@nestjs/common';
import { validateImageUpload } from './image-validation';

describe('validateImageUpload', () => {
  const validPdf = {
    originalname: 'payment-proof.pdf',
    mimetype: 'application/pdf',
    size: 13,
    buffer: Buffer.from('%PDF-1.7\n...'),
  };

  it('accepts a PDF with matching MIME type, extension, and signature', () => {
    expect(() => validateImageUpload(validPdf)).not.toThrow();
  });

  it('does not impose an application-level file-size limit', () => {
    expect(() => validateImageUpload({ ...validPdf, size: Number.MAX_SAFE_INTEGER })).not.toThrow();
  });

  it('rejects a non-PDF file renamed as a PDF', () => {
    expect(() =>
      validateImageUpload({
        ...validPdf,
        buffer: Buffer.from('not a PDF'),
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects a PDF with a non-PDF extension', () => {
    expect(() => validateImageUpload({ ...validPdf, originalname: 'payment-proof.png' })).toThrow(BadRequestException);
  });
});
