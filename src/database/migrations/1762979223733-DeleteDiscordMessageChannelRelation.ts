import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeleteDiscordMessageChannelRelation1762979223733
  implements MigrationInterface
{
  name = 'DeleteDiscordMessageChannelRelation1762979223733';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "discord_messages" DROP CONSTRAINT "FK_76252e043a20211c3374961b0a0"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "discord_messages"
            ADD CONSTRAINT "FK_76252e043a20211c3374961b0a0" FOREIGN KEY ("discord_channel_id") REFERENCES "discord_channels"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }
}
