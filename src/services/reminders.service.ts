import { Reminder } from '@Entities/reminder.entity';
import { ErrorCode } from '@Enums/error-code.enum';
import { ReminderStatus } from '@Enums/reminder-status.enum';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { err, ok, Result } from 'neverthrow';
import { LessThanOrEqual, Repository } from 'typeorm';

@Injectable()
export class RemindersService {
  constructor(
    @InjectRepository(Reminder)
    private readonly reminderRepository: Repository<Reminder>,
  ) {}

  async create({
    discordUserId,
    discordGuildId,
    sourceChannelId,
    content,
    remindAt,
  }: {
    discordUserId: string;
    discordGuildId: string | null;
    sourceChannelId: string;
    content: string;
    remindAt: Date;
  }): Promise<Reminder> {
    const entity = this.reminderRepository.create({
      discordUserId,
      discordGuildId,
      sourceChannelId,
      content,
      remindAt,
      status: ReminderStatus.PENDING,
    });
    return this.reminderRepository.save(entity);
  }

  async findDueBefore(date: Date): Promise<Reminder[]> {
    return this.reminderRepository.find({
      where: {
        status: ReminderStatus.PENDING,
        remindAt: LessThanOrEqual(date),
      },
      order: { remindAt: 'ASC' },
    });
  }

  async findActivePendingByUser(discordUserId: string): Promise<Reminder[]> {
    return this.reminderRepository.find({
      where: { discordUserId, status: ReminderStatus.PENDING },
      order: { remindAt: 'ASC' },
    });
  }

  async findById(id: string): Promise<Result<Reminder, ErrorCode>> {
    const entity = await this.reminderRepository.findOne({ where: { id } });
    return entity ? ok(entity) : err(ErrorCode.REMINDER_NOT_FOUND);
  }

  async findPendingByUserAndContentHint(
    discordUserId: string,
    hint: string,
  ): Promise<Reminder[]> {
    return this.reminderRepository
      .createQueryBuilder('reminder')
      .where('reminder.discordUserId = :discordUserId', { discordUserId })
      .andWhere('reminder.status = :status', { status: ReminderStatus.PENDING })
      .andWhere('reminder.content ILIKE :hint', { hint: `%${hint}%` })
      .orderBy('reminder.remindAt', 'ASC')
      .getMany();
  }

  async markSent(id: string): Promise<void> {
    await this.reminderRepository.update(id, { status: ReminderStatus.SENT });
  }

  async markFailed(id: string): Promise<void> {
    await this.reminderRepository.update(id, { status: ReminderStatus.FAILED });
  }

  async cancel(
    id: string,
    discordUserId: string,
  ): Promise<Result<Reminder, ErrorCode>> {
    const entity = await this.reminderRepository.findOne({
      where: { id, discordUserId, status: ReminderStatus.PENDING },
    });

    if (!entity) {
      return err(ErrorCode.REMINDER_NOT_FOUND);
    }

    entity.status = ReminderStatus.CANCELLED;
    return ok(await this.reminderRepository.save(entity));
  }
}
