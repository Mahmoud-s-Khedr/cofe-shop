import { DEFAULT_PAGE_SIZE } from '../constants';
import { OffsetPaginationQuery } from '../dto/offset-pagination-query.dto';

type ResolveOffsetPaginationOptions = {
  defaultLimit?: number;
  maxLimit: number;
};

export function resolveOffsetPagination(
  query: OffsetPaginationQuery,
  options: ResolveOffsetPaginationOptions,
): { limit: number; offset: number } {
  const defaultLimit = options.defaultLimit ?? DEFAULT_PAGE_SIZE;
  const limit = Math.min(query.limit ?? defaultLimit, options.maxLimit);
  const page = Math.max((query.page ?? 1) - 1, 0);
  const offset = query.offset ?? (page * limit);

  return { limit, offset };
}
