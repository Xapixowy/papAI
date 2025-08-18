import { CurrencyCode } from '@Enums/currency-code.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DiscordUser } from './discord-user.entity';

@Entity('discord_chatgpt_transactions')
export class DiscordChatgptTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('string', { name: 'discord_user_id' })
  discordUserId: string;

  @ManyToOne(() => DiscordUser, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'discord_user_id',
    referencedColumnName: 'userId',
  })
  discordUser: DiscordUser;

  @Column('double precision')
  amount: number;

  @Column({
    type: 'enum',
    enum: CurrencyCode,
    enumName: 'currency_code',
  })
  currency: CurrencyCode;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
