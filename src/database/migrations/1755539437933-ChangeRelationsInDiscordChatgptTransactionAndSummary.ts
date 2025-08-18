import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeRelationsInDiscordChatgptTransactionAndSummary1755539437933 implements MigrationInterface {
    name = 'ChangeRelationsInDiscordChatgptTransactionAndSummary1755539437933'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transaction_summaries" DROP CONSTRAINT "FK_e12a38d4044a334758759d9b0fb"
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transaction_summaries" DROP COLUMN "discord_user_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transaction_summaries"
            ADD "discord_user_id" character varying NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transactions" DROP CONSTRAINT "FK_f06ba114af1a2ce5b35b1bedb10"
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transactions" DROP COLUMN "discord_user_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transactions"
            ADD "discord_user_id" character varying NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transaction_summaries"
            ADD CONSTRAINT "FK_e12a38d4044a334758759d9b0fb" FOREIGN KEY ("discord_user_id") REFERENCES "discord_users"("userId") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transactions"
            ADD CONSTRAINT "FK_f06ba114af1a2ce5b35b1bedb10" FOREIGN KEY ("discord_user_id") REFERENCES "discord_users"("userId") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transactions" DROP CONSTRAINT "FK_f06ba114af1a2ce5b35b1bedb10"
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transaction_summaries" DROP CONSTRAINT "FK_e12a38d4044a334758759d9b0fb"
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transactions" DROP COLUMN "discord_user_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transactions"
            ADD "discord_user_id" uuid NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transactions"
            ADD CONSTRAINT "FK_f06ba114af1a2ce5b35b1bedb10" FOREIGN KEY ("discord_user_id") REFERENCES "discord_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transaction_summaries" DROP COLUMN "discord_user_id"
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transaction_summaries"
            ADD "discord_user_id" uuid NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transaction_summaries"
            ADD CONSTRAINT "FK_e12a38d4044a334758759d9b0fb" FOREIGN KEY ("discord_user_id") REFERENCES "discord_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

}
