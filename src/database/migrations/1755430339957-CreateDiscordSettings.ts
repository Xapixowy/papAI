import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDiscordSettings1755430339957 implements MigrationInterface {
    name = 'CreateDiscordSettings1755430339957'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "public"."discord_setting_type" AS ENUM('string', 'number', 'boolean', 'json', 'array')
        `);
        await queryRunner.query(`
            CREATE TABLE "discord_settings" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "key" character varying NOT NULL,
                "type" "public"."discord_setting_type" NOT NULL,
                "value" jsonb NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_d23921ed807a76f9ef0ca7dc541" UNIQUE ("key"),
                CONSTRAINT "PK_fd652d20ad1b01dd085b2af0cae" PRIMARY KEY ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE "discord_settings"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."discord_setting_type"
        `);
    }

}
