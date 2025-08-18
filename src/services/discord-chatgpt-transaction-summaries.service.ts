import { DiscordChatgptTransactionSummary } from '@Database/entities/discord-chatgpt-transaction-summary.entity';
import { ErrorCode } from '@Enums/error-code.enum';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { err, ok, Result } from 'neverthrow';
import { DiscordChatgptTransactionSummaryDto } from 'src/dtos/discord-chatgpt-transaction-summary.dto';
import { Repository } from 'typeorm';

@Injectable()
export class DiscordChatgptTransactionSummariesService {
  constructor(
    @InjectRepository(DiscordChatgptTransactionSummary)
    private readonly repository: Repository<DiscordChatgptTransactionSummary>,
  ) {}

  async findAll(): Promise<DiscordChatgptTransactionSummary[]> {
    const entities = await this.repository.find();
    return entities;
  }

  async findById(
    id: string,
  ): Promise<Result<DiscordChatgptTransactionSummary, ErrorCode>> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity
      ? ok(entity)
      : err(ErrorCode.DISCORD_CHATGPT_TRANSACTION_SUMMARY_NOT_FOUND);
  }

  async findByUserId(
    discordUserId: string,
  ): Promise<Result<DiscordChatgptTransactionSummary, ErrorCode>> {
    const entity = await this.repository.findOne({ where: { discordUserId } });
    return entity
      ? ok(entity)
      : err(ErrorCode.DISCORD_CHATGPT_TRANSACTION_SUMMARY_NOT_FOUND);
  }

  async create(
    dto: DiscordChatgptTransactionSummaryDto,
  ): Promise<Result<DiscordChatgptTransactionSummary, ErrorCode>> {
    const existingTransactionSummary = await this.findByUserId(
      dto.discordUserId,
    );

    if (existingTransactionSummary.isOk()) {
      return err(ErrorCode.DISCORD_CHATGPT_TRANSACTION_SUMMARY_EXISTS);
    }

    const newTransactionSummary = this.repository.create({
      discordUserId: dto.discordUserId,
      amount: dto.amount,
      currency: dto.currency,
    });

    const savedTransactionSummary = await this.repository.save(
      newTransactionSummary,
    );
    return ok(savedTransactionSummary);
  }

  async update(
    dto: DiscordChatgptTransactionSummaryDto,
  ): Promise<Result<DiscordChatgptTransactionSummary, ErrorCode>> {
    if (!dto.id && !dto.discordUserId) {
      return err(ErrorCode.DISCORD_CHATGPT_TRANSACTION_SUMMARY_NOT_FOUND);
    }

    const existingTransactionSummary = dto.id
      ? await this.findById(dto.id)
      : await this.findByUserId(dto.discordUserId);

    if (existingTransactionSummary.isErr()) {
      return err(ErrorCode.DISCORD_CHATGPT_TRANSACTION_SUMMARY_NOT_FOUND);
    }

    const transactionSummaryToUpdate = existingTransactionSummary.value;
    transactionSummaryToUpdate.amount = dto.amount;
    transactionSummaryToUpdate.currency = dto.currency;

    const updatedTransactionSummary = await this.repository.save(
      transactionSummaryToUpdate,
    );
    return ok(updatedTransactionSummary);
  }

  async deleteById(id: string): Promise<Result<void, ErrorCode>> {
    const result = await this.repository.delete({ id });
    return result.affected && result.affected > 0
      ? ok(undefined)
      : err(ErrorCode.DISCORD_CHATGPT_TRANSACTION_SUMMARY_NOT_FOUND);
  }

  async deleteByUserId(
    discordUserId: string,
  ): Promise<Result<void, ErrorCode>> {
    const result = await this.repository.delete({ discordUserId });
    return result.affected && result.affected > 0
      ? ok(undefined)
      : err(ErrorCode.DISCORD_CHATGPT_TRANSACTION_SUMMARY_NOT_FOUND);
  }
}
