import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { DiscordChannel } from './discord-channel.entity';

@Entity('discord_messages')
export class DiscordMessage {
  @PrimaryColumn('text')
  id: string;

  @Column('text', { name: 'message' })
  message: string;

  @Column('text', { name: 'attachments', array: true, nullable: true })
  attachments?: string[];

  @Column('text', { name: 'discord_user_id' })
  discordUserId: string;

  @Column('text', { name: 'discord_channel_id' })
  discordChannelId: string;

  @ManyToOne(() => DiscordChannel, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'discord_channel_id',
    referencedColumnName: 'id',
  })
  discordChannel: DiscordChannel;

  @Column('text', { name: 'discord_guild_id' })
  discordGuildId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
