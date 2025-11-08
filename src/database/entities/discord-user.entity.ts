import { DiscordUserRole } from '@Enums/discord-user-role.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DiscordChatgptTransactionSummary } from './discord-chatgpt-transaction-summary.entity';
import { DiscordChatgptTransaction } from './discord-chatgpt-transaction.entity';

@Entity('discord_users')
export class DiscordUser {
  @PrimaryColumn('text')
  id: string;

  @Column()
  username: string;

  @Column({
    type: 'enum',
    enum: DiscordUserRole,
    enumName: 'discord_user_role',
    array: true,
  })
  roles: DiscordUserRole[];

  @OneToMany(() => DiscordChatgptTransaction, (t) => t.discordUser)
  chatgptTransactions: DiscordChatgptTransaction[];

  @OneToMany(() => DiscordChatgptTransactionSummary, (s) => s.discordUser)
  chatgptTransactionSummaries: DiscordChatgptTransactionSummary[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
