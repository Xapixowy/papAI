import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBreakdownToFitCoachMeals1783100000000
  implements MigrationInterface
{
  name = 'AddBreakdownToFitCoachMeals1783100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "fit_coach_meals"
      ADD COLUMN "breakdown" jsonb DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "fit_coach_meals"
      DROP COLUMN "breakdown"
    `);
  }
}
