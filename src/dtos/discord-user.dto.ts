import { DiscordUser } from '@Database/entities/discord-user.entity';
import { DiscordUserRole } from '@Enums/discord-user-role.enum';
import { DiscordChatgptTransactionSummaryDto } from './discord-chatgpt-transaction-summary.dto';
import { DiscordChatgptTransactionDto } from './discord-chatgpt-transaction.dto';

export class DiscordUserDto {
  id?: string;
  userId: string;
  username: string;
  roles: DiscordUserRole[];
  chatgptTransactions?: DiscordChatgptTransactionDto[];
  chatgptTransactionSummaries?: DiscordChatgptTransactionSummaryDto[];
  createdAt?: Date;
  updatedAt?: Date;

  constructor({
    id,
    userId,
    username,
    roles,
    chatgptTransactions,
    chatgptTransactionSummaries,
    createdAt,
    updatedAt,
  }: {
    id?: string;
    userId: string;
    username: string;
    roles: DiscordUserRole[];
    chatgptTransactions?: DiscordChatgptTransactionDto[];
    chatgptTransactionSummaries?: DiscordChatgptTransactionSummaryDto[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = id;
    this.userId = userId;
    this.username = username;
    this.roles = roles;
    this.chatgptTransactions = chatgptTransactions;
    this.chatgptTransactionSummaries = chatgptTransactionSummaries;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static fromEntity(entity: DiscordUser): DiscordUserDto {
    return new DiscordUserDto({
      id: entity.id,
      userId: entity.userId,
      username: entity.username,
      roles: entity.roles,
      chatgptTransactions: entity.chatgptTransactions?.map((t) =>
        DiscordChatgptTransactionDto.fromEntity(t),
      ),
      chatgptTransactionSummaries: entity.chatgptTransactions?.map((t) =>
        DiscordChatgptTransactionSummaryDto.fromEntity(t),
      ),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
