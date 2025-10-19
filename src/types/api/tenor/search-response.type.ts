import { TenorSearchResult } from './tenor-search-result.type';

export type TenorSearchResponse = {
  results: TenorSearchResult[];
  next: string;
};
