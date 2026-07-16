import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('steam_users')
export class SteamUser {
  @PrimaryColumn({ type: 'text' })
  id: string;

  @Column({ type: 'text' })
  username: string;

  @Column({ type: 'text', name: 'avatar_url', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'text', name: 'profile_url', nullable: true })
  profileUrl: string | null;

  @Column({ type: 'timestamptz', name: 'games_last_synced_at', nullable: true })
  gamesLastSyncedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
