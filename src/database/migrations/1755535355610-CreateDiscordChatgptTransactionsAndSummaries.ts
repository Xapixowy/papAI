import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDiscordChatgptTransactionsAndSummaries1755535355610
  implements MigrationInterface
{
  name = 'CreateDiscordChatgptTransactionsAndSummaries1755535355610';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."currency_code" AS ENUM('USD', 'EUR', 'PLN')
        `);
    await queryRunner.query(`
            CREATE TABLE "discord_chatgpt_transaction_summaries" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "discord_user_id" uuid NOT NULL,
                "amount" numeric NOT NULL,
                "currency" "public"."currency_code" NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_eab888c4332fea0909a7e4feb69" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "discord_chatgpt_transactions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "discord_user_id" uuid NOT NULL,
                "amount" numeric NOT NULL,
                "currency" "public"."currency_code" NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_f7b82c514dbe04c13439be0be23" PRIMARY KEY ("id")
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transactions" DROP CONSTRAINT "FK_f06ba114af1a2ce5b35b1bedb10"
        `);
    await queryRunner.query(`
            ALTER TABLE "discord_chatgpt_transaction_summaries" DROP CONSTRAINT "FK_e12a38d4044a334758759d9b0fb"
        `);
    await queryRunner.query(`
            DROP TABLE "discord_chatgpt_transactions"
        `);
    await queryRunner.query(`
            DROP TABLE "discord_chatgpt_transaction_summaries"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."currency_code"
        `);
  }
}
