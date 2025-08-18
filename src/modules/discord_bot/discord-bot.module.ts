import { DiscordChatgptTransactionSummariesModule } from '@Modules/discord-chatgpt-transaction-summaries.module';
import { DiscordChatgptTransactionsModule } from '@Modules/discord-chatgpt-transactions.module';
import { DiscordSettingsModule } from '@Modules/discord-settings.module';
import { DiscordUsersModule } from '@Modules/discord-users.module';
import { Module } from '@nestjs/common';
import { BotCommandsService } from './commands/bot-commands.service';
import { ChatgptCommandsService } from './commands/chatgpt-commands.service';

@Module({
  imports: [
    DiscordUsersModule,
    DiscordSettingsModule,
    DiscordChatgptTransactionsModule,
    DiscordChatgptTransactionSummariesModule,
  ],
  providers: [BotCommandsService, ChatgptCommandsService],
})
export class DiscordBotModule {}
