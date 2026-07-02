import type { MealTimeRanges } from '@Types/fit-coach/meal-time-ranges.type';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('fit_coach_user_settings')
export class FitCoachUserSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { name: 'discord_user_id', unique: true })
  discordUserId: string;

  @Column('text', { name: 'timezone', default: 'UTC' })
  timezone: string;

  @Column({ type: 'jsonb', name: 'meal_time_ranges' })
  mealTimeRanges: MealTimeRanges;

  @Column('boolean', { name: 'is_onboarded', default: false })
  isOnboarded: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
