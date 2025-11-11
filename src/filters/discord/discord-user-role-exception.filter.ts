import { BOT_COMMANDS_CONFIG } from '@Constants/discord/bot-commands.constant';
import { DiscordUserRoleForbiddenException } from '@Exceptions/discord/discord-user-role-forbidden.exception';
import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { EmbedBuilderService } from '@Services/discord/embed-builder.service';
import { getDiscordInteractionFromArgs } from '@Utils/functions/get-discord-interction-from-args.function';
import { getDiscordMessageFromArgs } from '@Utils/functions/get-discord-message-from.args.function';
import { MessageFlags } from 'discord.js';

@Catch(DiscordUserRoleForbiddenException)
export class DiscordUserRoleExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(this.constructor.name);

  constructor(private readonly embedBuilderService: EmbedBuilderService) {}

  async catch(
    exception: DiscordUserRoleForbiddenException,
    host: ArgumentsHost,
  ) {
    const discordInteraction = getDiscordInteractionFromArgs(host.getArgs());
    const discordMessage = getDiscordMessageFromArgs(host.getArgs());
    const { message } = exception;

    if (!discordInteraction) {
      this.logger.error('Could not extract interaction from args.');
      return;
    }

    if (discordMessage || !discordInteraction) {
      this.logger.error(message);
      return;
    }

    const embed = this.embedBuilderService.simple({
      description: message,
      title: 'Authorization',
      variant: 'error',
      thumbnail: BOT_COMMANDS_CONFIG.embed.thumbnail,
      logger: this.logger,
    });

    try {
      if (discordInteraction.deferred || discordInteraction.replied) {
        await discordInteraction.editReply({ embeds: [embed] });
      } else {
        await discordInteraction.reply({
          flags: [MessageFlags.Ephemeral],
          embeds: [embed],
        });
      }
    } catch (error) {
      this.logger.warn(
        `Filter failed to send "forbid" message to user ${discordInteraction.user.id}`,
        error,
      );
    }
  }
}
