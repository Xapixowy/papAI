import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

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

  @Column('text', { name: 'discord_guild_id' })
  discordGuildId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
