import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('steam_user_games')
@Unique(['steamUserId', 'steamGameId'])
export class SteamUserGame {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', name: 'steam_user_id' })
  steamUserId: string;

  @Column({ type: 'int', name: 'steam_game_id' })
  steamGameId: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
