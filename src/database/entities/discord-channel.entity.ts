import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DiscordMessage } from './discord-message.entity';

@Entity('discord_channels')
export class DiscordChannel {
  @PrimaryColumn('text')
  id: string;

  @Column('text', { name: 'discord_server_id' })
  discordServerId: string;

  @Column('boolean', { name: 'human_save_messages', default: false })
  humanSaveMessages: boolean;

  @Column('boolean', { name: 'human_random_reply', default: false })
  humanRandomReply: boolean;

  @OneToMany(() => DiscordMessage, (m) => m.discordChannel)
  messages: DiscordMessage[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
