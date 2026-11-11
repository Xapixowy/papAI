import { Module } from '@nestjs/common';
import { GatewayIntentBits } from 'discord.js';
import { BingoSetController } from '@Controllers/discord/bingo/bingo-set.controller';
import { BingoContributorController } from '@Controllers/discord/bingo/bingo-contributor.controller';
import { BingoPhraseController } from '@Controllers/discord/bingo/bingo-phrase.controller';
import { BingoGameController } from '@Controllers/discord/bingo/bingo-game.controller';
import { BingoInteractionController } from '@Controllers/discord/bingo/bingo-interaction.controller';
import { BingoAutocompleteInterceptor } from '@Controllers/discord/bingo/bingo-autocomplete.interceptor';
import { BingoRepliesService } from '@Controllers/discord/bingo/bingo-replies.service';
import { BingoStoreService } from '@Services/bingo/bingo-store.service';
import { BingoRendererService } from '@Services/bingo/bingo-renderer.service';
import { BingoDiscordService } from '@Services/bingo/bingo-discord.service';
import { BaseCommandsModule } from './base-commands.module';

@Module({
  providers: [
    BingoSetController,
    BingoContributorController,
    BingoPhraseController,
    BingoGameController,
    BingoInteractionController,
    BingoAutocompleteInterceptor,
    BingoRepliesService,
    BingoStoreService,
    BingoRendererService,
    BingoDiscordService,
  ],
})
export class BingoCommandsModule extends BaseCommandsModule {
  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }
}
