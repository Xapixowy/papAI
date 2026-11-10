import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('wow_monitor_states')
export class WowMonitorState {
  @PrimaryColumn('text')
  key: string;

  @Column({ type: 'jsonb' })
  data: object;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
