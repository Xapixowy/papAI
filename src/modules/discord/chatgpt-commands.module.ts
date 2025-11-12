import { ChatgptCommandsController } from '@Controllers/discord/chatgpt-commands.controller';
import { ConfigCommandsController } from '@Controllers/discord/chatgpt/config-commands.controller';
import { ReminderChannelCommandsController } from '@Controllers/discord/chatgpt/reminder-channel-commands.controller';
import { SetCommandsController } from '@Controllers/discord/chatgpt/set-commands.controller';
import { TransactionCommandsController } from '@Controllers/discord/chatgpt/transaction-commands.controller';
import { UserCommandsController } from '@Controllers/discord/chatgpt/user-commands.controller';
import { DiscordChatgptTransactionSummariesModule } from '@Modules/discord-chatgpt-transaction-summaries.module';
import { DiscordChatgptTransactionsModule } from '@Modules/discord-chatgpt-transactions.module';
import { DiscordSettingsModule } from '@Modules/discord-settings.module';
import { DiscordUsersModule } from '@Modules/discord-users.module';
import { Module } from '@nestjs/common';
import { ChatgptEmbedBuilderService } from '@Services/discord/chatgpt/chatgpt-embed-builder.service';
import { ConfigCommandsService } from '@Services/discord/chatgpt/config-commands.service';
import { ReminderChannelCommandsService } from '@Services/discord/chatgpt/reminder-channel-commands.service';
import { SetCommandsService } from '@Services/discord/chatgpt/set-commands.service';
import { TransactionCommandsService } from '@Services/discord/chatgpt/transaction-commands.service';
import { UserCommandsService } from '@Services/discord/chatgpt/user-commands.service';
import { GatewayIntentBits } from 'discord.js';
import { BaseCommandsModule } from './base-commands.module';
import { EmbedBuilderModule } from './services/embed-builder.module';

@Module({
  imports: [
    EmbedBuilderModule,
    DiscordUsersModule,
    DiscordSettingsModule,
    DiscordChatgptTransactionsModule,
    DiscordChatgptTransactionSummariesModule,
  ],
  providers: [
    ChatgptEmbedBuilderService,
    ChatgptCommandsController,
    ConfigCommandsService,
    ConfigCommandsController,
    ReminderChannelCommandsService,
    ReminderChannelCommandsController,
    SetCommandsService,
    SetCommandsController,
    TransactionCommandsService,
    TransactionCommandsController,
    UserCommandsService,
    UserCommandsController,
  ],
})
export class ChatgptCommandsModule extends BaseCommandsModule {
  static get botIntents(): GatewayIntentBits[] {
    return [
      ...ConfigCommandsController.botIntents,
      ...ChatgptCommandsController.botIntents,
      ...ReminderChannelCommandsController.botIntents,
      ...SetCommandsController.botIntents,
      ...TransactionCommandsController.botIntents,
      ...UserCommandsController.botIntents,
    ];
  }
}
