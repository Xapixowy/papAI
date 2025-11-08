import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeleteDuplicatedIdInEntities1762454581421
  implements MigrationInterface
{
  name = 'DeleteDuplicatedIdInEntities1762454581421';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."discord_guild_configs_features_enum" AS ENUM('chatgpt', 'good_morning', 'human')
        `);
    await queryRunner.query(`
            CREATE TABLE "discord_guild_configs" (
                "id" text NOT NULL,
                "name" text,
                "features" "public"."discord_guild_configs_features_enum" array NOT NULL DEFAULT '{}',
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_4a44e122499c11898b6e2f7cba2" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "discord_channels" ( 
                "id" text NOT NULL,
                "discord_server_id" text NOT NULL,
                "human_save_messages" boolean NOT NULL DEFAULT false,
                "human_random_reply" boolean NOT NULL DEFAULT false,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_800cc234221fe0293393213395d" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transaction_summaries" DROP CONSTRAINT "FK_e12a38d4044a334758759d9b0fb"
        `);
    await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transaction_summaries" DROP COLUMN "discord_user_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transaction_summaries"
            ADD "discord_user_id" text NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transactions" DROP CONSTRAINT "FK_f06ba114af1a2ce5b35b1bedb10"
        `);
    await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transactions"
            ALTER COLUMN "discord_user_id" TYPE text
        `);
    await queryRunner.query(`
            ALTER TABLE "discord_users" DROP CONSTRAINT "UQ_a99965459e40e9afc2e30bd6975"
        `);
    await queryRunner.query(`
            ALTER TABLE "discord_users" DROP CONSTRAINT "PK_08f611f0deb6dec9299cbc8224a"
        `);
    await queryRunner.query(`
            ALTER TABLE "discord_users" DROP COLUMN "id"
        `);
    await queryRunner.query(`
            ALTER TABLE "discord_users" RENAME COLUMN "userId" TO "id"
        `);
    await queryRunner.query(`
            ALTER TABLE "discord_users"
            ALTER COLUMN "id" TYPE text
        `);
    await queryRunner.query(`
            ALTER TABLE "discord_users"
            ADD CONSTRAINT "PK_08f611f0deb6dec9299cbc8224a" PRIMARY KEY ("id")
        `);
    await queryRunner.query(`
            ALTER TYPE "public"."discord_user_role"
            RENAME TO "discord_user_role_old"
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."discord_user_role" AS ENUM('super_admin', 'chatgpt')
        `);
    await queryRunner.query(`
            ALTER TABLE "discord_users"
            ALTER COLUMN "roles" TYPE "public"."discord_user_role" [] USING "roles"::"text"::"public"."discord_user_role" []
        `);
    await queryRunner.query(`
            DROP TYPE "public"."discord_user_role_old"
        `);
    await queryRunner.query(`
            ALTER TABLE "discord_messages" DROP CONSTRAINT "PK_1b05f92f3a3470a4e5404539b51"
        `);
    await queryRunner.query(`
            ALTER TABLE "discord_messages" DROP COLUMN "id"
        `);
    await queryRunner.query(`
            ALTER TABLE "discord_messages" RENAME COLUMN "discord_message_id" TO "id"
        `);
    await queryRunner.query(`
            ALTER TABLE "discord_messages"
            ALTER COLUMN "id" TYPE text
        `);
    await queryRunner.query(`
            ALTER TABLE "discord_messages"
            ADD CONSTRAINT "PK_1b05f92f3a3470a4e5404539b51" PRIMARY KEY ("id")
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
        ALTER TABLE "discord_messages" DROP CONSTRAINT "FK_discord_messages_channel"
    `);
    await queryRunner.query(`
        ALTER TABLE "discord_chatgpt_transactions" DROP CONSTRAINT "FK_discord_chatgpt_transactions_user"
    `);
    await queryRunner.query(`
        ALTER TABLE "discord_chatgpt_transaction_summaries" DROP CONSTRAINT "FK_discord_chatgpt_transaction_summaries_user"
    `);
    await queryRunner.query(`
        CREATE TYPE "public"."discord_user_role_old" AS ENUM('super_admin', 'chatgpt', 'radarr', 'sonarr')
    `);
    await queryRunner.query(`
        ALTER TABLE "discord_users" 
        ALTER COLUMN "roles" TYPE "public"."discord_user_role_old" [] 
        USING "roles"::"text"::"public"."discord_user_role_old" []
    `);
    await queryRunner.query(`DROP TYPE "public"."discord_user_role"`);
    await queryRunner.query(
      `ALTER TYPE "public"."discord_user_role_old" RENAME TO "discord_user_role"`,
    );
    await queryRunner.query(`
        ALTER TABLE "discord_chatgpt_transactions" ALTER COLUMN "discord_user_id" TYPE uuid 
    `);
    await queryRunner.query(`
        ALTER TABLE "discord_chatgpt_transaction_summaries" DROP COLUMN "discord_user_id"
    `);
    await queryRunner.query(`
        ALTER TABLE "discord_chatgpt_transaction_summaries" ADD "discord_user_id" uuid NOT NULL
    `);
    await queryRunner.query(`
        ALTER TABLE "discord_messages" DROP CONSTRAINT "PK_discord_messages_id"
    `);
    await queryRunner.query(`
        ALTER TABLE "discord_messages" RENAME COLUMN "id" TO "discord_message_id"
    `);
    await queryRunner.query(`
        ALTER TABLE "discord_messages" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()
    `);
    await queryRunner.query(`
        ALTER TABLE "discord_messages" ADD CONSTRAINT "PK_1b05f92f3a3470a4e5404539b51" PRIMARY KEY ("id")
    `);
    await queryRunner.query(`
        ALTER TABLE "discord_users" DROP CONSTRAINT "PK_discord_users_id"
    `);
    await queryRunner.query(`
        ALTER TABLE "discord_users" RENAME COLUMN "id" TO "userId"
    `);
    await queryRunner.query(`
        ALTER TABLE "discord_users" ALTER COLUMN "userId" TYPE character varying
    `);
    await queryRunner.query(`
        ALTER TABLE "discord_users" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()
    `);
    await queryRunner.query(`
        ALTER TABLE "discord_users" ADD CONSTRAINT "PK_08f611f0deb6dec9299cbc8224a" PRIMARY KEY ("id")
    `);
    await queryRunner.query(`
        ALTER TABLE "discord_users" ADD CONSTRAINT "UQ_a99965459e40e9afc2e30bd6975" UNIQUE ("userId")
    `);
    await queryRunner.query(`
        ALTER TABLE "discord_chatgpt_transactions" 
        ADD CONSTRAINT "FK_f06ba114af1a2ce5b35b1bedb10" FOREIGN KEY ("discord_user_id") REFERENCES "discord_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
        ALTER TABLE "discord_chatgpt_transaction_summaries" 
        ADD CONSTRAINT "FK_e12a38d4044a334758759d9b0fb" FOREIGN KEY ("discord_user_id") REFERENCES "discord_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`DROP TABLE "discord_channels"`);
    await queryRunner.query(`DROP TABLE "discord_guild_configs"`);
    await queryRunner.query(
      `DROP TYPE "public"."discord_guild_configs_features_enum"`,
    );
  }
}
