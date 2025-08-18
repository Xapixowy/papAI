import { DiscordChatgptTransactionSummary } from '@Database/entities/discord-chatgpt-transaction-summary.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscordChatgptTransactionSummariesService } from '@Services/discord-chatgpt-transaction-summaries.service';

@Module({
  imports: [TypeOrmModule.forFeature([DiscordChatgptTransactionSummary])],
  providers: [DiscordChatgptTransactionSummariesService],
  exports: [DiscordChatgptTransactionSummariesService],
})
export class DiscordChatgptTransactionSummariesModule {}
