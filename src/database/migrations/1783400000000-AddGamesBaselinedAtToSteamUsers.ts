import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGamesBaselinedAtToSteamUsers1783400000000
  implements MigrationInterface
{
  name = 'AddGamesBaselinedAtToSteamUsers1783400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "steam_users"
      ADD "games_baselined_at" TIMESTAMP WITH TIME ZONE
    `);

    // Any Steam user who already has games recorded has clearly already been
    // baselined (either via the add-observer flow or a prior scheduler run).
    // Users with zero recorded games are left NULL so their first successful
    // (non-empty) sync is treated as a silent baseline instead of a flood of
    // "new game" notifications — this is what fixes the private→public spam.
    await queryRunner.query(`
      UPDATE "steam_users" su
      SET "games_baselined_at" = now()
      WHERE EXISTS (
        SELECT 1 FROM "steam_user_games" sug WHERE sug."steam_user_id" = su."id"
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "steam_users"
      DROP COLUMN "games_baselined_at"
    `);
  }
}
