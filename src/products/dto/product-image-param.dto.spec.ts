import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProductImageParamDto } from './product-image-param.dto';

describe('ProductImageParamDto', () => {
  it('accepts and converts both route parameters', async () => {
    const dto = plainToInstance(
      ProductImageParamDto,
      { id: '4', fileId: '5' },
      { enableImplicitConversion: true },
    );

    expect(dto).toEqual({ id: 4, fileId: 5 });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
