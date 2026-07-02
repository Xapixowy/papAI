import { MealType } from '@Enums/fit-coach/meal-type.enum';
import type { PendingMealBreakdownItem } from '@Types/fit-coach/pending-meal.type';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('fit_coach_meals')
export class FitCoachMeal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { name: 'discord_user_id' })
  discordUserId: string;

  @Column({
    type: 'enum',
    enum: MealType,
    enumName: 'fit_coach_meal_type',
    name: 'meal_type',
  })
  mealType: MealType;

  @Column('text', { name: 'name' })
  name: string;

  @Column('int', { name: 'calories' })
  calories: number;

  @Column('float', { name: 'protein' })
  protein: number;

  @Column('float', { name: 'fat' })
  fat: number;

  @Column('float', { name: 'carbs' })
  carbs: number;

  @Column({ type: 'timestamptz', name: 'meal_at' })
  mealAt: Date;

  @Column({ type: 'jsonb', name: 'breakdown', nullable: true, default: null })
  breakdown: PendingMealBreakdownItem[] | null;

  @Column({ type: 'int', name: 'portion_grams', nullable: true, default: null })
  portionGrams: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
