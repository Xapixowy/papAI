import { DiscordChatgptTransactionSummary } from '@Database/entities/discord-chatgpt-transaction-summary.entity';
import { CurrencyCode } from '@Enums/currency-code.enum';
import { DiscordUserDto } from './discord-user.dto';

export class DiscordChatgptTransactionSummaryDto {
  id?: string;
  discordUserId: string;
  discordUser?: DiscordUserDto;
  amount: number;
  currency: CurrencyCode;
  createdAt?: Date;
  updatedAt?: Date;

  constructor({
    id,
    discordUserId,
    discordUser,
    amount,
    currency,
    createdAt,
    updatedAt,
  }: {
    id?: string;
    discordUserId: string;
    discordUser?: DiscordUserDto;
    amount: number;
    currency: CurrencyCode;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = id;
    this.discordUserId = discordUserId;
    this.discordUser = discordUser;
    this.amount = amount;
    this.currency = currency;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static fromEntity(
    entity: DiscordChatgptTransactionSummary,
  ): DiscordChatgptTransactionSummaryDto {
    return new DiscordChatgptTransactionSummaryDto({
      id: entity.id,
      discordUserId: entity.discordUserId,
      discordUser:
        entity.discordUser && DiscordUserDto.fromEntity(entity.discordUser),
      amount: entity.amount,
      currency: entity.currency,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
