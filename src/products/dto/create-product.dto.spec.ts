import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProductCategory } from '../product-category.enum';
import { CreateProductDto } from './create-product.dto';
import { UpdateProductDto } from './update-product.dto';

describe('CreateProductDto', () => {
  it('treats a blank description as omitted', async () => {
    const dto = plainToInstance(CreateProductDto, {
      category: ProductCategory.coffee,
      title: 'Espresso',
      description: '   ',
      price: 150,
    });

    expect(dto.description).toBeUndefined();
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('accepts descriptions longer than 2,000 characters', async () => {
    const dto = plainToInstance(CreateProductDto, {
      category: ProductCategory.coffee,
      title: 'Espresso',
      description: 'a'.repeat(2001),
      price: 150,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('accepts an unlimited-length description when updating a product', async () => {
    const dto = plainToInstance(UpdateProductDto, {
      description: 'a'.repeat(10_000),
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
