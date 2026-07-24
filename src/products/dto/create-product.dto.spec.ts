import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProductCategory } from '../product-category.enum';
import { CreateProductDto } from './create-product.dto';

describe('CreateProductDto', () => {
  it('treats blank optional text fields as omitted', async () => {
    const dto = plainToInstance(CreateProductDto, {
      category: ProductCategory.coffee,
      title: 'Espresso',
      description: '   ',
      details: '',
      price: 150,
    });

    expect(dto.description).toBeUndefined();
    expect(dto.details).toBeUndefined();
    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
