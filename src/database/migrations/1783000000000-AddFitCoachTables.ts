import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFitCoachTables1783000000000 implements MigrationInterface {
  name = 'AddFitCoachTables1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."fit_coach_meal_type" AS ENUM(
        'breakfast',
        'second_breakfast',
        'lunch',
        'afternoon_snack',
        'dinner',
        'snack'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "fit_coach_meals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "discord_user_id" text NOT NULL,
        "meal_type" "public"."fit_coach_meal_type" NOT NULL,
        "name" text NOT NULL,
        "calories" integer NOT NULL,
        "protein" float NOT NULL,
        "fat" float NOT NULL,
        "carbs" float NOT NULL,
        "meal_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fit_coach_meals" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "fit_coach_user_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "discord_user_id" text NOT NULL,
        "timezone" text NOT NULL DEFAULT 'UTC',
        "meal_time_ranges" jsonb NOT NULL DEFAULT '{"breakfast":{"start":"06:00","end":"10:00"},"second_breakfast":{"start":"10:00","end":"12:00"},"lunch":{"start":"12:00","end":"15:00"},"afternoon_snack":{"start":"15:00","end":"17:00"},"dinner":{"start":"17:00","end":"21:00"},"snack":{"start":"21:00","end":"06:00"}}',
        "is_onboarded" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_fit_coach_user_settings_user" UNIQUE ("discord_user_id"),
        CONSTRAINT "PK_fit_coach_user_settings" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "fit_coach_user_settings"`);
    await queryRunner.query(`DROP TABLE "fit_coach_meals"`);
    await queryRunner.query(`DROP TYPE "public"."fit_coach_meal_type"`);
  }
}
