import { EnvKey } from '@Enums/env-key.enum';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KlipyService } from '@Services/api/klipy.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        baseURL: `https://api.klipy.com/api/v1/${configService.get<string>(EnvKey.KLIPY_APP_KEY)}`,
        timeout: 5000,
        maxRedirects: 5,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [KlipyService],
  exports: [KlipyService],
})
export class KlipyModule {}
