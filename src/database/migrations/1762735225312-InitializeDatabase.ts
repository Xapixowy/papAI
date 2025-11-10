import { MigrationInterface, QueryRunner } from "typeorm";

export class InitializeDatabase1762735225312 implements MigrationInterface {
    name = 'InitializeDatabase1762735225312'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "discord_chatgpt_transaction_summaries" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "discord_user_id" text NOT NULL,
                "amount" double precision NOT NULL,
                "currency" "public"."currency_code" NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_eab888c4332fea0909a7e4feb69" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "discord_chatgpt_transactions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "discord_user_id" text NOT NULL,
                "amount" double precision NOT NULL,
                "currency" "public"."currency_code" NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_f7b82c514dbe04c13439be0be23" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "discord_users" (
                "id" text NOT NULL,
                "username" character varying NOT NULL,
                "roles" "public"."discord_user_role" array NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_08f611f0deb6dec9299cbc8224a" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "discord_settings" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "discord_guild_id" text NOT NULL,
                "key" character varying NOT NULL,
                "type" "public"."discord_setting_type" NOT NULL,
                "value" jsonb NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_d23921ed807a76f9ef0ca7dc541" UNIQUE ("key"),
                CONSTRAINT "PK_fd652d20ad1b01dd085b2af0cae" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "discord_channels" (
                "id" text NOT NULL,
                "discord_guild_id" text NOT NULL,
                "features" json NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_800cc234221fe0293393213395d" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "discord_messages" (
                "id" text NOT NULL,
                "message" text NOT NULL,
                "attachments" text array,
                "discord_user_id" text NOT NULL,
                "discord_channel_id" text NOT NULL,
                "discord_guild_id" text NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_1b05f92f3a3470a4e5404539b51" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."discord_guilds_features_enum" AS ENUM('chatgpt', 'good_morning', 'human')
        `);
        await queryRunner.query(`
            CREATE TABLE "discord_guilds" (
                "id" text NOT NULL,
                "name" text,
                "features" "public"."discord_guilds_features_enum" array NOT NULL DEFAULT '{}',
                "channel_feature_defaults" json NOT NULL DEFAULT '{"human_save_messages":false,"human_random_reply":true}',
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_0549d637a8cf188fc8290f4313b" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transaction_summaries"
            ADD CONSTRAINT "FK_e12a38d4044a334758759d9b0fb" FOREIGN KEY ("discord_user_id") REFERENCES "discord_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transactions"
            ADD CONSTRAINT "FK_f06ba114af1a2ce5b35b1bedb10" FOREIGN KEY ("discord_user_id") REFERENCES "discord_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_messages"
            ADD CONSTRAINT "FK_76252e043a20211c3374961b0a0" FOREIGN KEY ("discord_channel_id") REFERENCES "discord_channels"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "discord_messages" DROP CONSTRAINT "FK_76252e043a20211c3374961b0a0"
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transactions" DROP CONSTRAINT "FK_f06ba114af1a2ce5b35b1bedb10"
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transaction_summaries" DROP CONSTRAINT "FK_e12a38d4044a334758759d9b0fb"
        `);
        await queryRunner.query(`
            DROP TABLE "discord_guilds"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."discord_guilds_features_enum"
        `);
        await queryRunner.query(`
            DROP TABLE "discord_messages"
        `);
        await queryRunner.query(`
            DROP TABLE "discord_channels"
        `);
        await queryRunner.query(`
            DROP TABLE "discord_settings"
        `);
        await queryRunner.query(`
            DROP TABLE "discord_users"
        `);
        await queryRunner.query(`
            DROP TABLE "discord_chatgpt_transactions"
        `);
        await queryRunner.query(`
            DROP TABLE "discord_chatgpt_transaction_summaries"
        `);
    }

}
