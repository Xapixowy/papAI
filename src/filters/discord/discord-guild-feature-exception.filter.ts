import { BOT_COMMANDS_CONFIG } from '@Constants/discord/bot-commands.constant';
import { DiscordGuildFeatureForbiddenException } from '@Exceptions/discord/discord-guild-feature-forbidden.exception';
import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { EmbedBuilderService } from '@Services/discord/embed-builder.service';
import { getDiscordInteractionFromArgs } from '@Utils/functions/get-discord-interction-from-args.function';
import { MessageFlags } from 'discord.js';

@Catch(DiscordGuildFeatureForbiddenException)
export class DiscordGuildFeatureExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(this.constructor.name);

  constructor(private readonly embedBuilderService: EmbedBuilderService) {}

  async catch(
    exception: DiscordGuildFeatureForbiddenException,
    host: ArgumentsHost,
  ) {
    const interaction = getDiscordInteractionFromArgs(host.getArgs());

    if (!interaction) {
      this.logger.error('Could not extract interaction from args.');
      return;
    }

    const embed = this.embedBuilderService.simple({
      description: exception.message,
      title: 'Guild',
      variant: 'error',
      thumbnail: BOT_COMMANDS_CONFIG.embed.thumbnail,
      logger: this.logger,
    });

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.reply({
          flags: [MessageFlags.Ephemeral],
          embeds: [embed],
        });
      }
    } catch (error) {
      this.logger.warn(
        `Filter failed to send "forbid" message to user ${interaction.user.id}`,
        error,
      );
    }
  }
}
