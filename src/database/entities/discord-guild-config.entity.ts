import { DiscordFeature } from '@Enums/discord-feature.enum';
import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('discord_guild_configs')
export class DiscordGuildConfig {
  @PrimaryColumn('text')
  id: string;

  @Column({ type: 'text', nullable: true })
  name: string;

  @Column({ type: 'enum', enum: DiscordFeature, array: true, default: [] })
  features: DiscordFeature[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @CreateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
