import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeAmountColumnsToDoublePrecision1755551450428 implements MigrationInterface {
    name = 'ChangeAmountColumnsToDoublePrecision1755551450428'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transaction_summaries" DROP COLUMN "amount"
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transaction_summaries"
            ADD "amount" double precision NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transactions" DROP COLUMN "amount"
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transactions"
            ADD "amount" double precision NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transactions" DROP COLUMN "amount"
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transactions"
            ADD "amount" numeric(10, 2) NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transaction_summaries" DROP COLUMN "amount"
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transaction_summaries"
            ADD "amount" numeric(10, 2) NOT NULL
        `);
    }

}
