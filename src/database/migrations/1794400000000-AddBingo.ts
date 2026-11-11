import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBingo1794400000000 implements MigrationInterface {
  name = 'AddBingo1794400000000';

  async up(q: QueryRunner): Promise<void> {
    await this.features(q, [
      'good_morning',
      'human',
      'steam',
      'reminders',
      'wow_forever',
      'bingo',
    ]);
    await q.query(`CREATE TABLE bingo_sets (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      guild_id text NOT NULL REFERENCES discord_guilds(id) ON DELETE CASCADE,
      name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
      owner_id text NOT NULL, archived boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (id, guild_id)
    )`);
    await q.query(
      `CREATE INDEX "IDX_bingo_sets_guild" ON bingo_sets(guild_id)`,
    );
    await q.query(`CREATE TABLE bingo_contributors (
      set_id uuid NOT NULL REFERENCES bingo_sets(id) ON DELETE CASCADE,
      user_id text NOT NULL, PRIMARY KEY (set_id, user_id)
    )`);
    await q.query(`CREATE TABLE bingo_phrases (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      set_id uuid NOT NULL REFERENCES bingo_sets(id) ON DELETE CASCADE,
      author_id text NOT NULL,
      text text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 80),
      normalized text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_bingo_phrase" UNIQUE (set_id, normalized)
    )`);
    await q.query(`CREATE TABLE bingo_games (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      set_id uuid NOT NULL, set_name text NOT NULL,
      guild_id text NOT NULL REFERENCES discord_guilds(id) ON DELETE CASCADE,
      channel_id text NOT NULL REFERENCES discord_channels(id) ON DELETE CASCADE,
      size integer NOT NULL CHECK (size IN (3, 4, 5)),
      cells jsonb NOT NULL CHECK (jsonb_typeof(cells) = 'array' AND jsonb_array_length(cells) = size * size),
      message_id text, ended_at timestamptz, bingo_at timestamptz, announced_at timestamptz,
      revision integer NOT NULL DEFAULT 1, synced_revision integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      FOREIGN KEY (set_id, guild_id) REFERENCES bingo_sets(id, guild_id) ON DELETE CASCADE
    )`);
    await q.query(
      `CREATE UNIQUE INDEX "UQ_bingo_active_channel" ON bingo_games(guild_id, channel_id) WHERE ended_at IS NULL`,
    );
    await q.query(
      `CREATE INDEX "IDX_bingo_pending" ON bingo_games(created_at) WHERE synced_revision < revision OR (bingo_at IS NOT NULL AND announced_at IS NULL)`,
    );
  }

  async down(q: QueryRunner): Promise<void> {
    for (const table of [
      'bingo_games',
      'bingo_phrases',
      'bingo_contributors',
      'bingo_sets',
    ])
      await q.query(`DROP TABLE ${table}`);
    await q.query(
      `UPDATE discord_channels SET features = (features::jsonb - 'bingo')::json`,
    );
    await q.query(
      `UPDATE discord_guilds SET channel_feature_defaults = (channel_feature_defaults::jsonb - 'bingo')::json, features = array_remove(features, 'bingo'::discord_guilds_features_enum)`,
    );
    await this.features(q, [
      'good_morning',
      'human',
      'steam',
      'reminders',
      'wow_forever',
    ]);
  }

  private async features(q: QueryRunner, values: string[]): Promise<void> {
    await q.query(
      'ALTER TYPE discord_guilds_features_enum RENAME TO discord_guilds_features_enum_old',
    );
    await q.query(
      `CREATE TYPE discord_guilds_features_enum AS ENUM (${values.map((v) => `'${v}'`).join(', ')})`,
    );
    await q.query(
      'ALTER TABLE discord_guilds ALTER COLUMN features DROP DEFAULT',
    );
    await q.query(
      'ALTER TABLE discord_guilds ALTER COLUMN features TYPE discord_guilds_features_enum[] USING features::text::discord_guilds_features_enum[]',
    );
    await q.query(
      `ALTER TABLE discord_guilds ALTER COLUMN features SET DEFAULT '{}'`,
    );
    await q.query('DROP TYPE discord_guilds_features_enum_old');
  }
}
