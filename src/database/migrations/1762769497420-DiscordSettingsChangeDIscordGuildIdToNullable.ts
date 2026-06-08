import { MigrationInterface, QueryRunner } from 'typeorm';

export class DiscordSettingsChangeDIscordGuildIdToNullable1762769497420
  implements MigrationInterface
{
  name = 'DiscordSettingsChangeDIscordGuildIdToNullable1762769497420';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "discord_settings"
            ALTER COLUMN "discord_guild_id" DROP NOT NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "discord_settings"
            ALTER COLUMN "discord_guild_id"
            SET NOT NULL
        `);
  }
}
