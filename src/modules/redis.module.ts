import { EnvKey } from '@Enums/env-key.enum';
import { ProviderToken } from '@Enums/provider-token.enum';
import { Global, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const redisProvider: Provider = {
  provide: ProviderToken.REDIS,
  useFactory: async (configService: ConfigService) => {
    const host = configService.get<string>(EnvKey.REDIS_HOST);
    const port = configService.get<number>(EnvKey.REDIS_PORT);

    const redis = new Redis({
      host: host,
      port: port,
      maxRetriesPerRequest: 0,
      enableReadyCheck: false,
    });

    try {
      await redis.ping();
      return redis;
    } catch (error) {
      throw new Error(`Could not connect to Redis: ${error}`);
    }
  },
  inject: [ConfigService],
};

@Global()
@Module({
  providers: [redisProvider],
  exports: [redisProvider],
})
export class RedisModule {}
