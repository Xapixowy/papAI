import { DiscordChatgptTransaction } from '@Database/entities/discord-chatgpt-transaction.entity';
import { ErrorCode } from '@Enums/error-code.enum';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { err, ok, Result } from 'neverthrow';
import { DiscordChatgptTransactionDto } from 'src/dtos/discord-chatgpt-transaction.dto';
import { Repository } from 'typeorm';

@Injectable()
export class DiscordChatgptTransactionsService {
  constructor(
    @InjectRepository(DiscordChatgptTransaction)
    private readonly repository: Repository<DiscordChatgptTransaction>,
  ) {}

  async findAll(): Promise<DiscordChatgptTransaction[]> {
    const entities = await this.repository.find();
    return entities;
  }

  async findAllByUserId(
    discordUserId: string,
  ): Promise<DiscordChatgptTransaction[]> {
    const entities = await this.repository.find({ where: { discordUserId } });
    return entities;
  }

  async findById(
    id: string,
  ): Promise<Result<DiscordChatgptTransaction, ErrorCode>> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity
      ? ok(entity)
      : err(ErrorCode.DISCORD_CHATGPT_TRANSACTION_NOT_FOUND);
  }

  async findByUserId(
    discordUserId: string,
  ): Promise<Result<DiscordChatgptTransaction, ErrorCode>> {
    const entity = await this.repository.findOne({ where: { discordUserId } });
    return entity
      ? ok(entity)
      : err(ErrorCode.DISCORD_CHATGPT_TRANSACTION_NOT_FOUND);
  }

  async create(
    dto: DiscordChatgptTransactionDto,
  ): Promise<Result<DiscordChatgptTransaction, ErrorCode>> {
    const newTransaction = this.repository.create({
      discordUserId: dto.discordUserId,
      amount: dto.amount,
      currency: dto.currency,
    });

    const savedTransaction = await this.repository.save(newTransaction);
    return ok(savedTransaction);
  }

  async update(
    dto: DiscordChatgptTransactionDto,
  ): Promise<Result<DiscordChatgptTransaction, ErrorCode>> {
    if (!dto.id && !dto.discordUserId) {
      return err(ErrorCode.DISCORD_CHATGPT_TRANSACTION_NOT_FOUND);
    }

    const existingTransaction = dto.id
      ? await this.findById(dto.id)
      : await this.findByUserId(dto.discordUserId);

    if (existingTransaction.isErr()) {
      return err(ErrorCode.DISCORD_CHATGPT_TRANSACTION_NOT_FOUND);
    }

    const transactionToUpdate = existingTransaction.value;
    transactionToUpdate.amount = dto.amount;
    transactionToUpdate.currency = dto.currency;

    const updatedTransaction = await this.repository.save(transactionToUpdate);
    return ok(updatedTransaction);
  }

  async deleteById(id: string): Promise<Result<void, ErrorCode>> {
    const result = await this.repository.delete({ id });
    return result.affected && result.affected > 0
      ? ok(undefined)
      : err(ErrorCode.DISCORD_CHATGPT_TRANSACTION_NOT_FOUND);
  }

  async deleteByUserId(
    discordUserId: string,
  ): Promise<Result<void, ErrorCode>> {
    const result = await this.repository.delete({ discordUserId });
    return result.affected && result.affected > 0
      ? ok(undefined)
      : err(ErrorCode.DISCORD_CHATGPT_TRANSACTION_NOT_FOUND);
  }
}
