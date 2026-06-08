import { EnvKey } from '@Enums/env-key.enum';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GiphyService } from '@Services/api/giphy.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        baseURL: 'https://api.giphy.com/v1',
        timeout: 5000,
        maxRedirects: 5,
        params: {
          api_key: configService.get<string>(EnvKey.GIPHY_API_KEY),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [GiphyService],
  exports: [GiphyService],
})
export class GiphyModule {}
