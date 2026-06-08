import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSteamTables1780926007654 implements MigrationInterface {
  name = 'AddSteamTables1780926007654';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "steam_users" (
                "id" text NOT NULL,
                "username" text NOT NULL,
                "avatar_url" text,
                "profile_url" text,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_c4c5292d0c4e5afc21cc1a09da8" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "steam_games" (
                "id" integer NOT NULL,
                "name" text NOT NULL,
                "icon_hash" text,
                "image_url" text,
                "description" text,
                "price" text,
                "platform_windows" boolean NOT NULL DEFAULT false,
                "platform_mac" boolean NOT NULL DEFAULT false,
                "platform_linux" boolean NOT NULL DEFAULT false,
                "metacritic_score" integer,
                "metacritic_url" text,
                "categories" text array NOT NULL DEFAULT '{}',
                "genres" text array NOT NULL DEFAULT '{}',
                "screenshots" text array NOT NULL DEFAULT '{}',
                "achievements_count" integer,
                "released_at" TIMESTAMP WITH TIME ZONE,
                "developers" text array NOT NULL DEFAULT '{}',
                "publishers" text array NOT NULL DEFAULT '{}',
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_1c31506395d88ad04ed7bbfff86" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "discord_steam_observers" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "discord_user_id" text NOT NULL,
                "discord_guild_id" text NOT NULL,
                "discord_channel_id" text NOT NULL,
                "steam_user_id" text NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_582d3c699de195ee6317bbda6b8" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "steam_user_games" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "steam_user_id" text NOT NULL,
                "steam_game_id" integer NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_625c37b30ecf08b50b3f543bd82" UNIQUE ("steam_user_id", "steam_game_id"),
                CONSTRAINT "PK_fda8803560d5d39aa9e991a55f0" PRIMARY KEY ("id")
            )
        `);
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
    await queryRunner.query(`
            ALTER TABLE "discord_guilds"
            ALTER COLUMN "channel_feature_defaults"
            SET DEFAULT '{"human_save_messages":false,"human_random_reply":true,"good_morning_messages":false,"steam":false}'
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "discord_guilds"
            ALTER COLUMN "channel_feature_defaults"
            SET DEFAULT '{"human_save_messages":false,"human_random_reply":true,"good_morning_messages":false}'
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."discord_guilds_features_enum_old" AS ENUM('good_morning', 'human')
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
            DROP TABLE "steam_user_games"
        `);
    await queryRunner.query(`
            DROP TABLE "discord_steam_observers"
        `);
    await queryRunner.query(`
            DROP TABLE "steam_games"
        `);
    await queryRunner.query(`
            DROP TABLE "steam_users"
        `);
  }
}
