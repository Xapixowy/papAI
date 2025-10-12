import { ErrorCode } from '@Enums/error-code.enum';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiskSpaceResponse } from '@Types/responses/radarr/disk-space-response.type';
import { QueueResponse } from '@Types/responses/radarr/queue-response.type';
import axios, { AxiosInstance } from 'axios';
import { err, ok, Result } from 'neverthrow';

@Injectable()
export class RadarrHttpClientService {
  private host: string;
  private port: number;
  private apiKey: string;
  private axios: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.host = this.configService.get<string>('RADARR_HOST')!;
    this.port = this.configService.get<number>('RADARR_PORT')!;
    this.apiKey = this.configService.get<string>('RADARR_API_KEY')!;
    this.axios = axios.create({
      baseURL: `http://${this.host}:${this.port}/api`,
      headers: {
        'X-Api-Key': this.apiKey,
      },
    });
  }

  async getDiskSpace(): Promise<Result<DiskSpaceResponse | null, ErrorCode>> {
    try {
      const response = await this.axios.get<DiskSpaceResponse>(`v3/diskspace`);

      return ok(response.data);
    } catch {
      return err(ErrorCode.RADARR_DISK_SPACE_NOT_FOUND);
    }
  }

  async getCurrentDownloads(): Promise<Result<QueueResponse, ErrorCode>> {
    try {
      const response = await this.axios.get<QueueResponse>(`v3/queue`);

      return ok(response.data);
    } catch {
      return err(ErrorCode.RADARR_DISK_SPACE_NOT_FOUND);
    }
  }
}
