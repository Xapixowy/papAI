import { CHANNEL_FEATURE_DEFAULTS } from '@Constants/discord-guild-config.constant';
import { DiscordChannelFeature } from '@Enums/discord/discord-channel-feature.enum';
import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('discord_guilds')
export class DiscordGuild {
  @PrimaryColumn('text')
  id: string;

  @Column({ type: 'text', nullable: true })
  name: string;

  @Column({ type: 'enum', enum: DiscordFeature, array: true, default: [] })
  features: DiscordFeature[];

  @Column({
    type: 'json',
    name: 'channel_feature_defaults',
    default: CHANNEL_FEATURE_DEFAULTS,
  })
  channelFeatureDefaults: Record<DiscordChannelFeature, boolean>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @CreateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
