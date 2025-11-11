import { REQUIRES_DISCORD_GUILD_FEATURE } from '@Decorators/requires-discord-guild-feature.decorator';
import { SILENT_REJECTION } from '@Decorators/silent-rejection.decorator';
import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { DiscordGuildFeatureForbiddenException } from '@Exceptions/discord/discord-guild-feature-forbidden.exception';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DiscordGuildService } from '@Services/discord-guild.service';
import { getDiscordInteractionFromArgs } from '@Utils/functions/get-discord-interction-from-args.function';

@Injectable()
export class DiscordGuildFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly discordGuildService: DiscordGuildService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const controller = context.getClass();

    // --- DEBUGGING START ---
    console.log('--- Guard Debug ---');
    console.log('Handler:', handler.name); // Pokaże nazwę metody (np. onQueryGetCommand)
    console.log('Controller:', controller.name); // Pokaże nazwę klasy (np. QueryCommandsController)

    const metadataFromHandler = this.reflector.get(SILENT_REJECTION, handler);
    const metadataFromClass = this.reflector.get(SILENT_REJECTION, controller);
    const metadataOverride = this.reflector.getAllAndOverride(
      SILENT_REJECTION,
      [handler, controller],
    );

    console.log('Metadata (Handler):', metadataFromHandler);
    console.log('Metadata (Class):', metadataFromClass);
    console.log('Metadata (Override):', metadataOverride);
    // --- DEBUGGING END ---

    const silentRejection =
      this.reflector.getAllAndOverride<true | undefined>(SILENT_REJECTION, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;

    const requiredDiscordGuildFeature =
      this.reflector.getAllAndOverride<DiscordFeature>(
        REQUIRES_DISCORD_GUILD_FEATURE,
        [context.getHandler(), context.getClass()],
      );

    if (!requiredDiscordGuildFeature) {
      throw new DiscordGuildFeatureForbiddenException(
        'This feature is not enabled on this guild.',
        silentRejection,
      );
    }

    const discordInteraction = getDiscordInteractionFromArgs(context.getArgs());

    if (!discordInteraction) {
      throw new DiscordGuildFeatureForbiddenException(
        'This feature is not enabled on this guild.',
        silentRejection,
      );
    }

    const guildId = discordInteraction.guildId;

    if (!guildId) {
      throw new DiscordGuildFeatureForbiddenException(
        'This feature is not enabled on this guild.',
        silentRejection,
      );
    }

    const discordGuild = await this.discordGuildService.findById(guildId);

    if (discordGuild.isErr()) {
      throw new DiscordGuildFeatureForbiddenException(
        'This feature is not enabled on this guild.',
        silentRejection,
      );
    }

    const discordGuildFeatures = discordGuild.value.features;

    const isFeatureOnTheGuildFeaturesList = discordGuildFeatures.includes(
      requiredDiscordGuildFeature,
    );

    if (!isFeatureOnTheGuildFeaturesList) {
      throw new DiscordGuildFeatureForbiddenException(
        'This feature is not enabled on this guild.',
        silentRejection,
      );
    }

    return true;
  }
}
