import { DiscordMessage } from '@Database/entities/discord-message.entity';
import { DiscordMessageDto } from '@DTOs/discord-message.dto';
import { ErrorCode } from '@Enums/error-code.enum';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { err, ok, Result } from 'neverthrow';
import { Repository } from 'typeorm';

@Injectable()
export class DiscordMessageService {
  constructor(
    @InjectRepository(DiscordMessage)
    private readonly discordMessageRepository: Repository<DiscordMessage>,
  ) {}

  async findAll(): Promise<DiscordMessage[]> {
    return this.discordMessageRepository.find();
  }

  async findAllByGuildId(
    guildId: string,
  ): Promise<Result<DiscordMessage[], ErrorCode>> {
    const entities = await this.discordMessageRepository.find({
      where: { discordGuildId: guildId },
    });

    return entities.length > 0
      ? ok(entities)
      : err(ErrorCode.DISCORD_MESSAGES_NOT_FOUND);
  }

  async findAllByUserId(
    userId: string,
  ): Promise<Result<DiscordMessage[], ErrorCode>> {
    const entities = await this.discordMessageRepository.find({
      where: { discordUserId: userId },
    });

    return entities.length > 0
      ? ok(entities)
      : err(ErrorCode.DISCORD_MESSAGES_NOT_FOUND);
  }

  async findById(id: string): Promise<Result<DiscordMessage, ErrorCode>> {
    const entity = await this.discordMessageRepository.findOne({
      where: { id },
    });
    return entity ? ok(entity) : err(ErrorCode.DISCORD_MESSAGE_NOT_FOUND);
  }

  async findRandomMessageByGuildId(
    guildId: string,
    count: number = 1,
  ): Promise<Result<DiscordMessage[], ErrorCode>> {
    const entities = await this.discordMessageRepository
      .createQueryBuilder('message')
      .where('message.discordGuildId = :guildId', { guildId })
      .orderBy('RANDOM()')
      .take(count)
      .getMany();

    return entities.length > 0
      ? ok(entities)
      : err(ErrorCode.DISCORD_MESSAGES_NOT_FOUND);
  }

  async create(
    dto: DiscordMessageDto,
  ): Promise<Result<DiscordMessage, ErrorCode>> {
    const newDiscordMessage = this.discordMessageRepository.create({
      id: dto.id,
      message: dto.message,
      attachments: dto.attachments,
      discordUserId: dto.discordUserId,
      discordChannelId: dto.discordChannelId,
      discordGuildId: dto.discordGuildId,
    });

    const savedDiscordMessage =
      await this.discordMessageRepository.save(newDiscordMessage);
    return ok(savedDiscordMessage);
  }

  async update(
    dto: DiscordMessageDto,
  ): Promise<Result<DiscordMessage, ErrorCode>> {
    if (!dto.id) {
      return err(ErrorCode.DISCORD_MESSAGE_NOT_FOUND);
    }

    const discordMessageToUpdate = await this.discordMessageRepository.findOne({
      where: { id: dto.id },
    });

    if (!discordMessageToUpdate) {
      return err(ErrorCode.DISCORD_MESSAGE_NOT_FOUND);
    }

    const updatedDiscordMessage = await this.discordMessageRepository.save({
      ...discordMessageToUpdate,
      id: dto.id,
      message: dto.message,
      attachments: dto.attachments,
      discordUserId: dto.discordUserId,
      discordChannelId: dto.discordChannelId,
      discordGuildId: dto.discordGuildId,
    });

    return ok(updatedDiscordMessage);
  }

  async deleteById(id: string): Promise<Result<void, ErrorCode>> {
    const result = await this.discordMessageRepository.delete({ id });
    return result.affected && result.affected > 0
      ? ok(undefined)
      : err(ErrorCode.DISCORD_MESSAGE_NOT_FOUND);
  }

  async deleteByDiscordMessageId(
    discordMessageId: string,
  ): Promise<Result<void, ErrorCode>> {
    const result = await this.discordMessageRepository.delete({
      id: discordMessageId,
    });
    return result.affected && result.affected > 0
      ? ok(undefined)
      : err(ErrorCode.DISCORD_MESSAGE_NOT_FOUND);
  }
}
