import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('wow_observers')
@Index('UQ_wow_observer', ['guildId', 'channelId', 'userId', 'characterSlug'], {
  unique: true,
})
export class WowObserver {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', name: 'guild_id' })
  guildId: string;

  @Column({ type: 'text', name: 'channel_id' })
  channelId: string;

  @Column({ type: 'text', name: 'user_id' })
  userId: string;

  @Column({ type: 'text', name: 'character_slug' })
  characterSlug: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
