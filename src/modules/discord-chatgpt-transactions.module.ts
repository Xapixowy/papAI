import { DiscordChatgptTransaction } from '@Database/entities/discord-chatgpt-transaction.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscordChatgptTransactionsService } from '@Services/discord-chatgpt-transactions.service';

@Module({
  imports: [TypeOrmModule.forFeature([DiscordChatgptTransaction])],
  providers: [DiscordChatgptTransactionsService],
  exports: [DiscordChatgptTransactionsService],
})
export class DiscordChatgptTransactionsModule {}
