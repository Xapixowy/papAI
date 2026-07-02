import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPortionGramsToFitCoachMeals1783200000000
  implements MigrationInterface
{
  name = 'AddPortionGramsToFitCoachMeals1783200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "fit_coach_meals"
      ADD COLUMN "portion_grams" integer DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "fit_coach_meals"
      DROP COLUMN "portion_grams"
    `);
  }
}
