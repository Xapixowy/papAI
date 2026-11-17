import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { Client } from 'discord.js';
import { NecordModule, SlashCommandsService } from 'necord';
import { QuoteCommandsModule } from '@Modules/discord/quote-commands.module';
import { QuoteStoreService } from './quote-store.service';
import { QuoteDiscordService } from './quote-discord.service';
import { QuoteUiService } from './quote-ui.service';
import { ConfigModule } from '@nestjs/config';

describe('Quote command registration', () => {
  let module: TestingModule;
  beforeAll(async () => {
    const login = jest
      .spyOn(Client.prototype, 'login')
      .mockResolvedValue('test');
    try {
      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
          NecordModule.forRoot({ token: 'test', intents: [] }),
          QuoteCommandsModule,
        ],
      })
        .overrideProvider(QuoteStoreService)
        .useValue({})
        .overrideProvider(QuoteDiscordService)
        .useValue({})
        .overrideProvider(QuoteUiService)
        .useValue({})
        .compile();
      await module.init();
    } finally {
      login.mockRestore();
    }
  });
  afterAll(async () => {
    await module?.close();
  });

  it('registers exactly the agreed five commands without database ID options', () => {
    const root = module.get(SlashCommandsService).get('quote');
    expect(root).toBeDefined();
    expect([...root.getSubcommands().keys()].sort()).toEqual([
      'add',
      'edit',
      'random',
      'remove',
      'show',
    ]);
    expect(root.getSubcommand('show').toJSON().options).toEqual([
      expect.objectContaining({
        name: 'author',
        required: false,
        max_length: 100,
      }),
    ]);
    expect(root.getSubcommand('add').toJSON().options).toEqual([]);
    const random: unknown = root.getSubcommand('random').toJSON().options;
    expect(random).toEqual([
      expect.objectContaining({
        name: 'author',
        required: false,
        max_length: 100,
      }),
    ]);
  });
});
