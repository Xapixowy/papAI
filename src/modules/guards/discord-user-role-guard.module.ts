import { DiscordUserRoleExceptionFilter } from '@Filters/discord/discord-user-role-exception.filter';
import { DiscordUserRoleGuard } from '@Guards/discord/discord-user-role.guard';
import { DiscordUsersModule } from '@Modules/discord-users.module';
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { EmbedBuilderModule } from '../discord/services/embed-builder.module';

@Module({
  imports: [EmbedBuilderModule, DiscordUsersModule],
  providers: [
    DiscordUserRoleGuard,
    {
      provide: APP_FILTER,
      useClass: DiscordUserRoleExceptionFilter,
    },
  ],
  exports: [EmbedBuilderModule, DiscordUsersModule, DiscordUserRoleGuard],
})
export class DiscordUserRoleGuardModule {}
