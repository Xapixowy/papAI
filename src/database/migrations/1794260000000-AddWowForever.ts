import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWowForever1794260000000 implements MigrationInterface {
  name = 'AddWowForever1794260000000';

  async up(q: QueryRunner): Promise<void> {
    await this.features(q, [
      'good_morning',
      'human',
      'steam',
      'reminders',
      'wow_forever',
    ]);
    await q.query(`CREATE TABLE wow_observers (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      guild_id text NOT NULL REFERENCES discord_guilds(id) ON DELETE CASCADE,
      channel_id text NOT NULL REFERENCES discord_channels(id) ON DELETE CASCADE,
      user_id text NOT NULL,
      character_slug text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(
      `CREATE UNIQUE INDEX "UQ_wow_observer" ON wow_observers(guild_id, channel_id, user_id, character_slug)`,
    );
    await q.query(`CREATE TABLE wow_status_watches (
      guild_id text PRIMARY KEY REFERENCES discord_guilds(id) ON DELETE CASCADE,
      channel_id text NOT NULL REFERENCES discord_channels(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE TABLE wow_monitor_states (
      key text PRIMARY KEY,
      data jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE TABLE wow_notifications (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      event_key text NOT NULL,
      guild_id text NOT NULL REFERENCES discord_guilds(id) ON DELETE CASCADE,
      channel_id text NOT NULL REFERENCES discord_channels(id) ON DELETE CASCADE,
      kind text NOT NULL,
      character_slug text,
      embeds jsonb NOT NULL,
      attempts int NOT NULL DEFAULT 0,
      next_attempt_at timestamptz NOT NULL DEFAULT now(),
      sent_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(
      `CREATE UNIQUE INDEX "UQ_wow_notification_event" ON wow_notifications(event_key)`,
    );
    await q.query(
      `CREATE INDEX "IDX_wow_notifications_pending" ON wow_notifications(next_attempt_at) WHERE sent_at IS NULL`,
    );
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE wow_notifications');
    await q.query('DROP TABLE wow_monitor_states');
    await q.query('DROP TABLE wow_status_watches');
    await q.query('DROP TABLE wow_observers');
    await q.query(
      `UPDATE discord_channels SET features = (features::jsonb - 'wow_forever')::json`,
    );
    await q.query(`UPDATE discord_guilds SET channel_feature_defaults = (channel_feature_defaults::jsonb - 'wow_forever')::json,
      features = array_remove(features, 'wow_forever'::discord_guilds_features_enum)`);
    await this.features(q, ['good_morning', 'human', 'steam', 'reminders']);
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
