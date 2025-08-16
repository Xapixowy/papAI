import { DiscordUserRole } from '@Enums/discord-user-role.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('discord_users')
export class DiscordUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @Column()
  username: string;

  @Column({
    type: 'enum',
    enum: DiscordUserRole,
    enumName: 'discord_user_role',
    array: true,
  })
  roles: DiscordUserRole[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
