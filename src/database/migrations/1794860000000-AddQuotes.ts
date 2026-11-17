import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuotes1794860000000 implements MigrationInterface {
  name = 'AddQuotes1794860000000';

  async up(q: QueryRunner): Promise<void> {
    await this.features(q, true);
    await q.query(`CREATE TABLE quotes (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      guild_id text NOT NULL REFERENCES discord_guilds(id) ON DELETE CASCADE,
      author text NOT NULL CHECK (char_length(author) BETWEEN 1 AND 100),
      content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
      normalized_author text NOT NULL, fingerprint text NOT NULL,
      submitter_id text NOT NULL,
      created_at timestamptz(3) NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      revision integer NOT NULL DEFAULT 1,
      CONSTRAINT "UQ_quotes_duplicate" UNIQUE (guild_id, fingerprint)
    )`);
    await q.query(
      'CREATE INDEX "IDX_quotes_browse" ON quotes(guild_id, created_at, id)',
    );
    await q.query(`CREATE TABLE quote_random_states (
      guild_id text NOT NULL REFERENCES discord_guilds(id) ON DELETE CASCADE,
      channel_id text NOT NULL,
      last_quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL,
      PRIMARY KEY (guild_id, channel_id)
    )`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE quote_random_states');
    await q.query('DROP TABLE quotes');
    await q.query(
      `UPDATE discord_guilds SET features = array_remove(features, 'quotes'::discord_guilds_features_enum)`,
    );
    await this.features(q, false);
  }

  private async features(q: QueryRunner, quotes: boolean): Promise<void> {
    const values = [
      'good_morning',
      'human',
      'steam',
      'reminders',
      'wow_forever',
      'bingo',
    ];
    if (quotes) values.push('quotes');
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
