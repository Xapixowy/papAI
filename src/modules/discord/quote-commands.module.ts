import { Module } from '@nestjs/common';
import { GatewayIntentBits } from 'discord.js';
import { QuoteCommandsController } from '@Controllers/discord/quote-commands.controller';
import { QuoteDiscordService } from '@Services/quotes/quote-discord.service';
import { QuoteStoreService } from '@Services/quotes/quote-store.service';
import { QuoteUiService } from '@Services/quotes/quote-ui.service';
import { BaseCommandsModule } from './base-commands.module';
import { EmbedBuilderModule } from './services/embed-builder.module';

@Module({
  imports: [EmbedBuilderModule],
  providers: [
    QuoteCommandsController,
    QuoteDiscordService,
    QuoteStoreService,
    QuoteUiService,
  ],
})
export class QuoteCommandsModule extends BaseCommandsModule {
  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }
}
