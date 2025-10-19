import { EnvKey } from '@Enums/env-key.enum';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TenorService } from '@Services/api/tenor.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        baseURL: 'https://tenor.googleapis.com/v2',
        timeout: 5000,
        maxRedirects: 5,
        params: {
          key: configService.get<string>(EnvKey.TENOR_API_KEY),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [TenorService],
  exports: [TenorService],
})
export class TenorModule {}
