import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameGamesBaselinedAtToLastSyncedAt1783500000000
  implements MigrationInterface
{
  name = 'RenameGamesBaselinedAtToLastSyncedAt1783500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "steam_users"
      RENAME COLUMN "games_baselined_at" TO "games_last_synced_at"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "steam_users"
      RENAME COLUMN "games_last_synced_at" TO "games_baselined_at"
    `);
  }
}
