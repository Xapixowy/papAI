import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

export interface BingoCell {
  phraseId: string;
  text: string;
  markedBy: string | null;
  markedAt: string | null;
}

@Entity('bingo_sets')
export class BingoSet {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'guild_id', type: 'text' }) guildId: string;
  @Column({ type: 'text' }) name: string;
  @Column({ name: 'owner_id', type: 'text' }) ownerId: string;
  @Column({ type: 'boolean', default: false }) archived: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

@Entity('bingo_contributors')
export class BingoContributor {
  @PrimaryColumn({ name: 'set_id', type: 'uuid' }) setId: string;
  @PrimaryColumn({ name: 'user_id', type: 'text' }) userId: string;
}

@Entity('bingo_phrases')
@Index('UQ_bingo_phrase', ['setId', 'normalized'], { unique: true })
export class BingoPhrase {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'set_id', type: 'uuid' }) setId: string;
  @Column({ name: 'author_id', type: 'text' }) authorId: string;
  @Column({ type: 'text' }) text: string;
  @Column({ type: 'text' }) normalized: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

@Entity('bingo_games')
@Index('UQ_bingo_active_channel', ['guildId', 'channelId'], {
  unique: true,
  where: 'ended_at IS NULL',
})
export class BingoGame {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'set_id', type: 'uuid' }) setId: string;
  @Column({ name: 'set_name', type: 'text' }) setName: string;
  @Column({ name: 'guild_id', type: 'text' }) guildId: string;
  @Column({ name: 'channel_id', type: 'text' }) channelId: string;
  @Column({ type: 'integer' }) size: number;
  @Column({ type: 'jsonb' }) cells: BingoCell[];
  @Column({ name: 'message_id', type: 'text', nullable: true }) messageId:
    string | null;
  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date | null;
  @Column({ name: 'bingo_at', type: 'timestamptz', nullable: true })
  bingoAt: Date | null;
  @Column({ name: 'announced_at', type: 'timestamptz', nullable: true })
  announcedAt: Date | null;
  @Column({ type: 'integer', default: 1 }) revision: number;
  @Column({ name: 'synced_revision', type: 'integer', default: 0 })
  syncedRevision: number;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
