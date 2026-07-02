import { FitCoachMeal } from '@Entities/fit-coach-meal.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FitCoachMealsService } from '@Services/fit-coach-meals.service';

@Module({
  imports: [TypeOrmModule.forFeature([FitCoachMeal])],
  providers: [FitCoachMealsService],
  exports: [FitCoachMealsService],
})
export class FitCoachMealsModule {}
