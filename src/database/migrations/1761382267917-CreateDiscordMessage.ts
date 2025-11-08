import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDiscordMessage1761382267917 implements MigrationInterface {
    name = 'CreateDiscordMessage1761382267917'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "discord_messages" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "message" text NOT NULL,
                "attachments" text array,
                "discord_message_id" text NOT NULL,
                "discord_user_id" text NOT NULL,
                "discord_channel_id" text NOT NULL,
                "discord_server_id" text NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_1b05f92f3a3470a4e5404539b51" PRIMARY KEY ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE "discord_messages"
        `);
    }

}
