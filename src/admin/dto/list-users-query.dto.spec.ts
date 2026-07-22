import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListUsersQueryDto } from './list-users-query.dto';

describe('ListUsersQueryDto', () => {
  it('rejects invalid pagination values', async () => {
    const dto = plainToInstance(ListUsersQueryDto, { page: 0, limit: -1, offset: -2 });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts valid query values', async () => {
    const dto = plainToInstance(ListUsersQueryDto, {
      status: 'ACTIVE',
      q: 'ahmed',
      page: 2,
      limit: 20,
      offset: 0,
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('accepts page-only query values', async () => {
    const dto = plainToInstance(ListUsersQueryDto, {
      status: 'ACTIVE',
      q: 'ahmed',
      page: 2,
      limit: 20,
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});
