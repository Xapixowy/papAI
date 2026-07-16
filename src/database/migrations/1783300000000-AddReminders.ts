import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReminders1783300000000 implements MigrationInterface {
  name = 'AddReminders1783300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."reminders_status_enum" AS ENUM(
        'pending',
        'sent',
        'cancelled',
        'failed'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "reminders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "discord_user_id" text NOT NULL,
        "discord_guild_id" text,
        "source_channel_id" text NOT NULL,
        "content" text NOT NULL,
        "remind_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "status" "public"."reminders_status_enum" NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reminders" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_reminders_status_remind_at" ON "reminders" ("status", "remind_at")
    `);

    await queryRunner.query(`
      ALTER TYPE "public"."discord_guilds_features_enum"
      RENAME TO "discord_guilds_features_enum_old"
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."discord_guilds_features_enum" AS ENUM('good_morning', 'human', 'steam', 'reminders')
    `);
    await queryRunner.query(`
      ALTER TABLE "discord_guilds"
      ALTER COLUMN "features" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TABLE "discord_guilds"
      ALTER COLUMN "features" TYPE "public"."discord_guilds_features_enum" [] USING "features"::"text"::"public"."discord_guilds_features_enum" []
    `);
    await queryRunner.query(`
      ALTER TABLE "discord_guilds"
      ALTER COLUMN "features"
      SET DEFAULT '{}'
    `);
    await queryRunner.query(`
      DROP TYPE "public"."discord_guilds_features_enum_old"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."discord_guilds_features_enum"
      RENAME TO "discord_guilds_features_enum_old"
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."discord_guilds_features_enum" AS ENUM('good_morning', 'human', 'steam')
    `);
    await queryRunner.query(`
      ALTER TABLE "discord_guilds"
      ALTER COLUMN "features" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TABLE "discord_guilds"
      ALTER COLUMN "features" TYPE "public"."discord_guilds_features_enum" [] USING "features"::"text"::"public"."discord_guilds_features_enum" []
    `);
    await queryRunner.query(`
      ALTER TABLE "discord_guilds"
      ALTER COLUMN "features"
      SET DEFAULT '{}'
    `);
    await queryRunner.query(`
      DROP TYPE "public"."discord_guilds_features_enum_old"
    `);

    await queryRunner.query(
      `DROP INDEX "public"."IDX_reminders_status_remind_at"`,
    );
    await queryRunner.query(`DROP TABLE "reminders"`);
    await queryRunner.query(`DROP TYPE "public"."reminders_status_enum"`);
  }
}
