export interface PaginationMeta {
  totalItems: number;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export class PaginatedResponseDto<T> {
  data: T[];
  pagination: PaginationMeta;

  constructor(data: T[], pagination: PaginationMeta) {
    this.data = data;
    this.pagination = pagination;
  }

  static create<T>(data: T[], totalItems: number, page: number, limit: number): PaginatedResponseDto<T> {
    const totalPages = Math.ceil(totalItems / limit);
    return new PaginatedResponseDto<T>(data, {
      totalItems,
      currentPage: page,
      totalPages,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    });
  }
}
