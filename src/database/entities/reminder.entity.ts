import { ReminderStatus } from '@Enums/reminder-status.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('reminders')
export class Reminder {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column('text', { name: 'discord_user_id' })
  discordUserId: string;

  @Column('text', { name: 'discord_guild_id', nullable: true })
  discordGuildId: string | null;

  @Column('text', { name: 'source_channel_id' })
  sourceChannelId: string;

  @Column('text', { name: 'content' })
  content: string;

  @Column('timestamptz', { name: 'remind_at' })
  remindAt: Date;

  @Column({
    type: 'enum',
    enum: ReminderStatus,
    name: 'status',
    default: ReminderStatus.PENDING,
  })
  status: ReminderStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
