import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNameForDiscordChannel1762894276425 implements MigrationInterface {
    name = 'AddNameForDiscordChannel1762894276425'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "discord_channels"
            ADD "name" text NOT NULL
        `);
        await queryRunner.query(`
            ALTER TYPE "public"."discord_guilds_features_enum"
            RENAME TO "discord_guilds_features_enum_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."discord_guilds_features_enum" AS ENUM('good_morning', 'human')
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
        await queryRunner.query(`
            ALTER TABLE "discord_guilds"
            ALTER COLUMN "channel_feature_defaults"
            SET DEFAULT '{"human_save_messages":false,"human_random_reply":true,"good_morning_messages":false}'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "discord_guilds"
            ALTER COLUMN "channel_feature_defaults"
            SET DEFAULT '{"human_save_messages":false,"human_random_reply":true}'
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."discord_guilds_features_enum_old" AS ENUM('chatgpt', 'good_morning', 'human')
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_guilds"
            ALTER COLUMN "features" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_guilds"
            ALTER COLUMN "features" TYPE "public"."discord_guilds_features_enum_old" [] USING "features"::"text"::"public"."discord_guilds_features_enum_old" []
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_guilds"
            ALTER COLUMN "features"
            SET DEFAULT '{}'
        `);
        await queryRunner.query(`
            DROP TYPE "public"."discord_guilds_features_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "public"."discord_guilds_features_enum_old"
            RENAME TO "discord_guilds_features_enum"
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_channels" DROP COLUMN "name"
        `);
    }

}
