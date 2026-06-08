import { KlipySearchResult } from './search-result.type';

export type KlipySearchResponse = {
  result: boolean;
  data: {
    data: KlipySearchResult[];
    current_page: number;
    per_page: number;
    has_next: boolean;
  };
};
