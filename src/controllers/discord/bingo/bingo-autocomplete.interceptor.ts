import { Injectable } from '@nestjs/common';
import { AutocompleteInterceptor } from 'necord';
import type { AutocompleteInteraction } from 'discord.js';
import { BingoStoreService } from '@Services/bingo/bingo-store.service';
import { BingoDiscordService } from '@Services/bingo/bingo-discord.service';

@Injectable()
export class BingoAutocompleteInterceptor extends AutocompleteInterceptor {
  constructor(
    private readonly store: BingoStoreService,
    private readonly discord: BingoDiscordService,
  ) {
    super();
  }
  async transformOptions(interaction: AutocompleteInteraction): Promise<void> {
    try {
      const focused = interaction.options.getFocused(true);
      const actor = await this.discord.actor(interaction);
      const setId =
        focused.name === 'phrase'
          ? interaction.options.getString('set')
          : undefined;
      if (focused.name === 'phrase' && !setId) {
        await interaction.respond([]);
        return;
      }
      await interaction.respond(
        await this.store.suggestions(
          actor,
          String(focused.value),
          setId ?? undefined,
        ),
      );
    } catch (error) {
      this.discord.logFailure(
        'autocomplete',
        {
          guild: interaction.guildId,
          channel: interaction.channelId,
          user: interaction.user.id,
        },
        error,
      );
      try {
        if (!interaction.responded) await interaction.respond([]);
      } catch (replyError) {
        this.discord.logFailure(
          'autocomplete-reply',
          { guild: interaction.guildId },
          replyError,
        );
      }
    }
  }
}
