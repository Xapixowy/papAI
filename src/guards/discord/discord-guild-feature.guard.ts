import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { DiscordGuildFeatureForbiddenException } from '@Exceptions/discord/discord-guild-feature-forbidden.exception';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DiscordGuildService } from '@Services/discord-guild.service';
import { getDiscordInteractionFromArgs } from '@Utils/functions/get-discord-interction-from-args.function';
import { REQUIRES_DISCORD_GUILD_FEATURE } from '../../decorators/requires-discord-guild-feature.decorator';

@Injectable()
export class DiscordGuildFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly discordGuildService: DiscordGuildService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredDiscordGuildFeature =
      this.reflector.getAllAndOverride<DiscordFeature>(
        REQUIRES_DISCORD_GUILD_FEATURE,
        [context.getHandler(), context.getClass()],
      );

    if (!requiredDiscordGuildFeature) {
      throw new DiscordGuildFeatureForbiddenException(
        'This feature is not enabled on this guild.',
      );
    }

    const discordInteraction = getDiscordInteractionFromArgs(context.getArgs());

    if (!discordInteraction) {
      throw new DiscordGuildFeatureForbiddenException(
        'This feature is not enabled on this guild.',
      );
    }

    const guildId = discordInteraction.guildId;

    if (!guildId) {
      throw new DiscordGuildFeatureForbiddenException(
        'This feature is not enabled on this guild.',
      );
    }

    const discordGuild = await this.discordGuildService.findById(guildId);

    if (discordGuild.isErr()) {
      throw new DiscordGuildFeatureForbiddenException(
        'This feature is not enabled on this guild.',
      );
    }

    const discordGuildFeatures = discordGuild.value.features;

    const isFeatureOnTheGuildFeaturesList = discordGuildFeatures.includes(
      requiredDiscordGuildFeature,
    );

    if (!isFeatureOnTheGuildFeaturesList) {
      throw new DiscordGuildFeatureForbiddenException(
        'This feature is not enabled on this guild.',
      );
    }

    return true;
  }
}
