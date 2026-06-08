import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('steam_games')
export class SteamGame {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', name: 'icon_hash', nullable: true })
  iconHash: string | null;

  @Column({ type: 'text', name: 'image_url', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  price: string | null;

  @Column({ type: 'boolean', name: 'platform_windows', default: false })
  platformWindows: boolean;

  @Column({ type: 'boolean', name: 'platform_mac', default: false })
  platformMac: boolean;

  @Column({ type: 'boolean', name: 'platform_linux', default: false })
  platformLinux: boolean;

  @Column({ type: 'int', name: 'metacritic_score', nullable: true })
  metacriticScore: number | null;

  @Column({ type: 'text', name: 'metacritic_url', nullable: true })
  metacriticUrl: string | null;

  @Column({ type: 'text', array: true, default: [] })
  categories: string[];

  @Column({ type: 'text', array: true, default: [] })
  genres: string[];

  @Column({ type: 'text', array: true, default: [] })
  screenshots: string[];

  @Column({ type: 'int', name: 'achievements_count', nullable: true })
  achievementsCount: number | null;

  @Column({ type: 'timestamptz', name: 'released_at', nullable: true })
  releasedAt: Date | null;

  @Column({ type: 'text', array: true, default: [] })
  developers: string[];

  @Column({ type: 'text', array: true, default: [] })
  publishers: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
