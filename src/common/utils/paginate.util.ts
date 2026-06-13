import { PaginationMeta } from '../dtos/paginated-response.dto';

export function buildPaginationMeta(
  totalItems: number,
  page: number,
  limit: number,
): PaginationMeta {
  const totalPages = Math.ceil(totalItems / limit);

  return {
    totalItems,
    currentPage: page,
    totalPages,
    itemsPerPage: limit,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
