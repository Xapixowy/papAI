import { EnvKey } from '@Enums/env-key.enum';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SteamApiService } from '@Services/api/steam.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        baseURL: 'https://api.steampowered.com/',
        timeout: 10000,
        maxRedirects: 5,
        params: {
          key: configService.get<string>(EnvKey.STEAM_API_KEY),
          format: 'json',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [SteamApiService],
  exports: [SteamApiService],
})
export class SteamApiModule {}
