import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { APIEmbed } from 'discord.js';

@Entity('wow_notifications')
export class WowNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('UQ_wow_notification_event', { unique: true })
  @Column({ type: 'text', name: 'event_key' })
  eventKey: string;

  @Column({ type: 'text', name: 'guild_id' })
  guildId: string;

  @Column({ type: 'text', name: 'channel_id' })
  channelId: string;

  @Column({ type: 'text' })
  kind: 'status' | 'character';

  @Column({ type: 'text', name: 'character_slug', nullable: true })
  characterSlug: string | null;

  @Column({ type: 'jsonb' })
  embeds: APIEmbed[];

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({
    type: 'timestamptz',
    name: 'next_attempt_at',
    default: () => 'now()',
  })
  nextAttemptAt: Date;

  @Column({ type: 'timestamptz', name: 'sent_at', nullable: true })
  sentAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
