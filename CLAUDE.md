# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Dev (watch mode)
pnpm run start:dev

# Build
pnpm run build

# Lint (auto-fix)
pnpm run lint

# Tests (no test files exist yet — jest config targets *.spec.ts in src/)
pnpm run test
pnpm run test:e2e

# Database migrations
pnpm run migration:generate --name=<migration-name>
pnpm run migration:run
pnpm run migration:revert

# Docker (full stack: app + postgres + redis)
pnpm run docker:up
```

`synchronize: false` — always use migrations, never let TypeORM auto-sync the schema.

## Architecture

NestJS Discord bot backed by PostgreSQL (TypeORM) and Redis. No HTTP REST API — all user interaction is through Discord slash commands and message events via [necord](https://necord.org/) (Discord.js wrapper for NestJS).

External APIs: **Gemini** (Google AI) and **Tenor** (GIF search).

### Module pattern

Each Discord feature is a `*CommandsModule` under `src/modules/discord/`. Every command module:
- Extends `BaseCommandsModule` and exposes a static `botIntents` getter
- Registers its `GatewayIntentBits` from both its controller(s) and service(s)
- Is imported by `DiscordModule`, which aggregates all intents for Necord

Shared entity access modules (e.g., `DiscordGuildModule`, `DiscordChannelModule`, `DiscordUsersModule`) live in `src/modules/` and are imported by command modules that need DB access.

### Controllers vs Services

In this repo, "controllers" are Necord-decorated classes that handle Discord interactions/events (`@SlashCommand`, `@On`, `@SubCommand`, etc.) — they are not HTTP controllers. Services contain the business logic. Both are `@Injectable()` providers registered in the same module.

### Guards & Feature flags

Commands can be gated by:
- `DiscordGuildFeatureGuard` + `@RequiresDiscordGuildFeature(DiscordFeature.X)` — checks `discord_settings` table for a guild-level feature flag
- `DiscordUserRoleGuard` — role-based access per guild

Features are stored as rows in `discord_settings` (key/value JSONB, scoped by `discordGuildId`).

### Error handling

Uses [neverthrow](https://github.com/supermacro/neverthrow) (`Result<T, E>`) for explicit error propagation in services. `eslint-plugin-neverthrow` enforces that `Result` values are not ignored.

### Path aliases

All `src/` subdirectories have TypeScript path aliases (`@Controllers/*`, `@Services/*`, `@Entities/*`, `@Modules/*`, `@Enums/*`, `@Guards/*`, `@Utils/*`, `@DTOs/*`, etc.) — use these, never relative imports.

### Env vars

Defined in `EnvKey` enum (`src/enums/env-key.enum.ts`). Required: `DISCORD_BOT_TOKEN`, `POSTGRES_*`, `REDIS_*`, `GEMINI_API_KEY`, `TENOR_API_KEY`. Copy `.env.example` to `.env` to get started. `DISCORD_BOT_DEVELOPMENT_GUILD_ID` scopes slash commands to one guild during development.
