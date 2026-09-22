export interface PagedResult<T> {
  items: T[];
  // Total de resultados que matchean los filtros aplicados — no el total
  // sin filtrar. Necesario para calcular la cantidad de páginas.
  totalCount: number;
  page: number;
  pageSize: number;
}
