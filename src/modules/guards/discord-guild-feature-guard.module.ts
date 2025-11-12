import { DiscordGuildFeatureExceptionFilter } from '@Filters/discord/discord-guild-feature-exception.filter';
import { DiscordGuildFeatureGuard } from '@Guards/discord/discord-guild-feature.guard';
import { DiscordGuildModule } from '@Modules/discord-guild.module';
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { EmbedBuilderModule } from '../discord/services/embed-builder.module';

@Module({
  imports: [EmbedBuilderModule, DiscordGuildModule],
  providers: [
    DiscordGuildFeatureGuard,
    {
      provide: APP_FILTER,
      useClass: DiscordGuildFeatureExceptionFilter,
    },
  ],
  exports: [EmbedBuilderModule, DiscordGuildModule, DiscordGuildFeatureGuard],
})
export class DiscordGuildFeatureGuardModule {}
