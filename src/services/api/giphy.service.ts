import { GIPHY_CONFIG } from '@Constants/gif-providers.constant';
import { ErrorCode } from '@Enums/error-code.enum';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { GifContentFilter } from '@Types/api/gif-content-filter.type';
import { GiphySearchResponse } from '@Types/api/giphy/search-response.type';
import { AxiosError, AxiosResponse } from 'axios';
import { err, ok, Result } from 'neverthrow';
import { catchError, firstValueFrom, map } from 'rxjs';

@Injectable()
export class GiphyService {
  private readonly logger = new Logger(GiphyService.name);

  constructor(private readonly httpService: HttpService) {}

  async searchGifs({
    query,
    limit = 10,
    offset = 0,
    randomize = false,
    contentFilter = 'medium',
  }: {
    query: string;
    limit?: number;
    /** Pagination offset. Default: 0. */
    offset?: number;
    /** Randomize results by picking a random offset. Overrides `offset`. Default: false. */
    randomize?: boolean;
    /** Content safety level. Default: 'medium' (maps to Giphy rating 'pg'). */
    contentFilter?: GifContentFilter;
  }): Promise<Result<GiphySearchResponse, ErrorCode>> {
    const resolvedOffset = randomize
      ? Math.floor(Math.random() * GIPHY_CONFIG.randomOffsetMax)
      : offset;

    try {
      const response = await firstValueFrom(
        this.httpService
          .get<GiphySearchResponse>('gifs/search', {
            params: {
              q: query,
              limit,
              offset: resolvedOffset,
              rating: GIPHY_CONFIG.contentFilterRating[contentFilter],
            },
          })
          .pipe(
            map(
              (response: AxiosResponse<GiphySearchResponse>) => response.data,
            ),
            catchError((error: AxiosError) => {
              this.logger.error(
                `Error fetching GIFs for query "${query}": ${error.response?.status}`,
              );
              throw error;
            }),
          ),
      );

      return ok(response);
    } catch {
      return err(ErrorCode.GIPHY_SEARCH_NOT_FOUND);
    }
  }
}
