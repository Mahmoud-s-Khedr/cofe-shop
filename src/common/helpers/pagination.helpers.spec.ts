import { resolveOffsetPagination } from './pagination.helpers';

describe('resolveOffsetPagination', () => {
  it('derives offset from page when offset is absent', () => {
    expect(resolveOffsetPagination({ page: 3, limit: 10 }, { defaultLimit: 20, maxLimit: 100 })).toEqual({
      limit: 10,
      offset: 20,
    });
  });

  it('prefers explicit offset over derived page offset', () => {
    expect(resolveOffsetPagination({ page: 3, limit: 10, offset: 5 }, { defaultLimit: 20, maxLimit: 100 })).toEqual({
      limit: 10,
      offset: 5,
    });
  });
});
