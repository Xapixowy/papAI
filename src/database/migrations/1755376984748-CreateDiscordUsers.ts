import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDiscordUsers1755376984748 implements MigrationInterface {
    name = 'CreateDiscordUsers1755376984748'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "public"."discord_user_role" AS ENUM('super_admin', 'chatgpt')
        `);
        await queryRunner.query(`
            CREATE TABLE "discord_users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" character varying NOT NULL,
                "username" character varying NOT NULL,
                "roles" "public"."discord_user_role" array NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_a99965459e40e9afc2e30bd6975" UNIQUE ("userId"),
                CONSTRAINT "PK_08f611f0deb6dec9299cbc8224a" PRIMARY KEY ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE "discord_users"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."discord_user_role"
        `);
    }

}
