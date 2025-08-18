import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPrecisionAndScaleToAmountValues1755551251345 implements MigrationInterface {
    name = 'AddPrecisionAndScaleToAmountValues1755551251345'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transaction_summaries"
            ALTER COLUMN "amount" TYPE numeric(10, 2)
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transactions"
            ALTER COLUMN "amount" TYPE numeric(10, 2)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transactions"
            ALTER COLUMN "amount" TYPE numeric
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transaction_summaries"
            ALTER COLUMN "amount" TYPE numeric
        `);
    }

}
