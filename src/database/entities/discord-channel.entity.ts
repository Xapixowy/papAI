import { DiscordChannelFeature } from '@Enums/discord/discord-channel-feature.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('discord_channels')
export class DiscordChannel {
  @PrimaryColumn({
    type: 'text',
  })
  id: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', name: 'discord_guild_id' })
  discordGuildId: string;

  @Column({ type: 'json' })
  features: Record<DiscordChannelFeature, boolean>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
