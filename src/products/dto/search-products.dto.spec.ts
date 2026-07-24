import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SearchProductsDto } from './search-products.dto';

describe('SearchProductsDto', () => {
  it.each([
    ['true', true],
    ['false', false],
  ])('parses available=%s without losing its boolean value', async (value, expected) => {
    const dto = plainToInstance(
      SearchProductsDto,
      { available: value },
      { enableImplicitConversion: true },
    );

    expect(dto.available).toBe(expected);
    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
