import { ErrorCode } from '@Enums/error-code.enum';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { GifContentFilter } from '@Types/api/gif-content-filter.type';
import { KlipySearchResponse } from '@Types/api/klipy/search-response.type';
import { AxiosError, AxiosResponse } from 'axios';
import { err, ok, Result } from 'neverthrow';
import { catchError, firstValueFrom, map } from 'rxjs';

const KLIPY_RANDOM_PAGE_MAX = 5;

@Injectable()
export class KlipyService {
  private readonly logger = new Logger(KlipyService.name);

  constructor(private readonly httpService: HttpService) {}

  async searchGifs({
    query,
    limit = 24,
    page = 1,
    randomize = false,
    contentFilter = 'medium',
  }: {
    query: string;
    limit?: number;
    /** Pagination page number. Default: 1. */
    page?: number;
    /** Randomize results by picking a random page (1–5). Overrides `page`. Default: false. */
    randomize?: boolean;
    /** Content safety level. Default: 'medium'. */
    contentFilter?: GifContentFilter;
  }): Promise<Result<KlipySearchResponse, ErrorCode>> {
    const resolvedPage = randomize
      ? Math.floor(Math.random() * KLIPY_RANDOM_PAGE_MAX) + 1
      : page;

    try {
      const response = await firstValueFrom(
        this.httpService
          .get<KlipySearchResponse>('gifs/search', {
            params: {
              q: query,
              per_page: limit,
              page: resolvedPage,
              content_filter: contentFilter,
            },
          })
          .pipe(
            map(
              (response: AxiosResponse<KlipySearchResponse>) => response.data,
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
      return err(ErrorCode.KLIPY_SEARCH_NOT_FOUND);
    }
  }
}
