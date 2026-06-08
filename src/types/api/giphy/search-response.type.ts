import { GiphySearchResult } from './search-result.type';

export type GiphySearchResponse = {
  data: GiphySearchResult[];
  pagination: {
    total_count: number;
    count: number;
    offset: number;
  };
  meta: {
    status: number;
    msg: string;
    response_id: string;
  };
};
