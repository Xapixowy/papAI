import { MigrationInterface, QueryRunner } from 'typeorm';

export class RetryWowPatchSummaries1795730000000 implements MigrationInterface {
  name = 'RetryWowPatchSummaries1795730000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE wow_notifications
      ADD COLUMN patch_summary_input jsonb,
      ADD COLUMN message_id text`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`UPDATE wow_notifications SET sent_at = now()
      WHERE message_id IS NOT NULL AND sent_at IS NULL`);
    await q.query(`ALTER TABLE wow_notifications
      DROP COLUMN message_id,
      DROP COLUMN patch_summary_input`);
  }
}
