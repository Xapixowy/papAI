import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('wow_status_watches')
export class WowStatusWatch {
  @PrimaryColumn({ type: 'text', name: 'guild_id' })
  guildId: string;

  @Column({ type: 'text', name: 'channel_id' })
  channelId: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
