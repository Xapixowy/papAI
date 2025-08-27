import { DiscordChatgptTransactionSummariesModule } from '@Modules/discord-chatgpt-transaction-summaries.module';
import { DiscordChatgptTransactionsModule } from '@Modules/discord-chatgpt-transactions.module';
import { DiscordSettingsModule } from '@Modules/discord-settings.module';
import { DiscordUsersModule } from '@Modules/discord-users.module';
import { Module } from '@nestjs/common';
import { GatewayIntentBits } from 'discord.js';
import { ChatgptCommandsController } from '../controllers/chatgpt-commands.controller';
import { SetCommandsController } from '../controllers/chatgpt/set-commands.controller';
import { TransactionCommandsController } from '../controllers/chatgpt/transaction-commands.controller';
import { UserCommandsController } from '../controllers/chatgpt/user-commands.controller';
import { ChatgptCommandsService } from '../services/chatgpt-commands.service';
import { BaseCommandsModule } from './base-commands.module';

@Module({
  imports: [
    DiscordUsersModule,
    DiscordSettingsModule,
    DiscordChatgptTransactionsModule,
    DiscordChatgptTransactionSummariesModule,
  ],
  providers: [
    ChatgptCommandsService,
    ChatgptCommandsController,
    UserCommandsController,
    SetCommandsController,
    TransactionCommandsController,
  ],
})
export class ChatgptCommandsModule extends BaseCommandsModule {
  static get botIntents(): GatewayIntentBits[] {
    return [
      ...ChatgptCommandsController.botIntents,
      ...UserCommandsController.botIntents,
      ...SetCommandsController.botIntents,
      ...TransactionCommandsController.botIntents,
    ];
  }
}
