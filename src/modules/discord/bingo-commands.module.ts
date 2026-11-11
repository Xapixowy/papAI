import { BingoBoardActionsController } from '@Controllers/discord/bingo/bingo-board-actions.controller';
import { Module } from '@nestjs/common';
import { GatewayIntentBits } from 'discord.js';
import { BingoSetController } from '@Controllers/discord/bingo/bingo-set.controller';
import { BingoContributorController } from '@Controllers/discord/bingo/bingo-contributor.controller';
import { BingoPhraseController } from '@Controllers/discord/bingo/bingo-phrase.controller';
import { BingoGameController } from '@Controllers/discord/bingo/bingo-game.controller';
import { BingoInteractionController } from '@Controllers/discord/bingo/bingo-interaction.controller';
import { BingoSelectionService } from '@Services/bingo/bingo-selection.service';
import { BingoSelectionController } from '@Controllers/discord/bingo/bingo-selection.controller';
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
    BingoBoardActionsController,
    BingoSelectionService,
    BingoSelectionController,
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
