import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('quotes')
@Index('UQ_quotes_duplicate', ['guildId', 'fingerprint'], { unique: true })
@Index('IDX_quotes_browse', ['guildId', 'createdAt', 'id'])
export class Quote {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'guild_id', type: 'text' }) guildId: string;
  @Column({ type: 'text' }) author: string;
  @Column({ type: 'text' }) content: string;
  @Column({ name: 'normalized_author', type: 'text' }) normalizedAuthor: string;
  @Column({ type: 'text' }) fingerprint: string;
  @Column({ name: 'submitter_id', type: 'text' }) submitterId: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', precision: 3 })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
  @Column({ type: 'integer', default: 1 }) revision: number;
}

@Entity('quote_random_states')
export class QuoteRandomState {
  @PrimaryColumn({ name: 'guild_id', type: 'text' }) guildId: string;
  @PrimaryColumn({ name: 'channel_id', type: 'text' }) channelId: string;
  @Column({ name: 'last_quote_id', type: 'uuid', nullable: true })
  lastQuoteId: string | null;
}
