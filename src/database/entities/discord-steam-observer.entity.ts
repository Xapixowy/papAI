import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('discord_steam_observers')
export class DiscordSteamObserver {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', name: 'discord_user_id' })
  discordUserId: string;

  @Column({ type: 'text', name: 'discord_guild_id' })
  discordGuildId: string;

  @Column({ type: 'text', name: 'discord_channel_id' })
  discordChannelId: string;

  @Column({ type: 'text', name: 'steam_user_id' })
  steamUserId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
