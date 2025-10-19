import { ErrorCode } from '@Enums/error-code.enum';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { TenorSearchResponse } from '@Types/api/tenor/search-response.type';
import { AxiosError, AxiosResponse } from 'axios';
import { err, ok, Result } from 'neverthrow';
import { catchError, firstValueFrom, map } from 'rxjs';

@Injectable()
export class TenorService {
  private readonly logger = new Logger(TenorService.name);

  constructor(private readonly httpService: HttpService) {}

  async searchGifs({
    query,
    limit = 10,
    random = false,
    media_filter = 'gif,tinygif',
  }: {
    query: string;
    limit?: number;
    random?: boolean;
    media_filter?: string;
  }): Promise<Result<TenorSearchResponse, ErrorCode>> {
    try {
      const response = await firstValueFrom(
        this.httpService
          .get<TenorSearchResponse>(`search`, {
            params: {
              q: query,
              limit,
              random,
              media_filter,
            },
          })
          .pipe(
            map(
              (response: AxiosResponse<TenorSearchResponse>) => response.data,
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
      return err(ErrorCode.TENOR_SEARCH_NOT_FOUND);
    }
  }
}
