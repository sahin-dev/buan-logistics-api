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
}
