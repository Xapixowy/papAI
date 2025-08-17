import { DiscordSettingType } from '@Enums/discord-setting-type.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('discord_settings')
export class DiscordSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  @Column({
    type: 'enum',
    enum: DiscordSettingType,
    enumName: 'discord_setting_type',
  })
  type: DiscordSettingType;

  @Column({ type: 'jsonb' })
  value: unknown;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
