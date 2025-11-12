import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewDiscordUserRole1762976321827 implements MigrationInterface {
    name = 'AddNewDiscordUserRole1762976321827'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TYPE "public"."discord_user_role"
            RENAME TO "discord_user_role_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."discord_user_role" AS ENUM('super_admin', 'admin', 'chatgpt')
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_users"
            ALTER COLUMN "roles" TYPE "public"."discord_user_role" [] USING "roles"::"text"::"public"."discord_user_role" []
        `);
        await queryRunner.query(`
            DROP TYPE "public"."discord_user_role_old"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "public"."discord_user_role_old" AS ENUM('super_admin', 'chatgpt')
        `);
        await queryRunner.query(`
            ALTER TABLE "discord_users"
            ALTER COLUMN "roles" TYPE "public"."discord_user_role_old" [] USING "roles"::"text"::"public"."discord_user_role_old" []
        `);
        await queryRunner.query(`
            DROP TYPE "public"."discord_user_role"
        `);
        await queryRunner.query(`
            ALTER TYPE "public"."discord_user_role_old"
            RENAME TO "discord_user_role"
        `);
    }

}
