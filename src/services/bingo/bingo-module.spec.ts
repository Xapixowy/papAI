import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { Client, ApplicationCommandOptionType } from 'discord.js';
import { NecordModule, SlashCommandsService } from 'necord';
import { BingoCommandsModule } from '@Modules/discord/bingo-commands.module';
import { BingoStoreService } from './bingo-store.service';
import { BingoDiscordService } from './bingo-discord.service';

describe('Bingo Discord command registration', () => {
  let module: TestingModule;
  beforeAll(async () => {
    const login = jest
      .spyOn(Client.prototype, 'login')
      .mockResolvedValue('test');
    module = await Test.createTestingModule({
      imports: [
        NecordModule.forRoot({ token: 'test', intents: [] }),
        BingoCommandsModule,
      ],
    })
      .overrideProvider(BingoStoreService)
      .useValue({})
      .overrideProvider(BingoDiscordService)
      .useValue({})
      .compile();
    await module.init();
    login.mockRestore();
  });
  afterAll(async () => {
    await module?.close();
  });

  it('discovers all 14 commands and preserves inherited required options before optional options', () => {
    const root = module.get(SlashCommandsService).get('bingo');
    expect(root).toBeDefined();
    const groups = root.getSubcommands();
    expect([...groups.keys()].sort()).toEqual([
      'contributor',
      'game',
      'phrase',
      'set',
    ]);
    let commands = 0;
    for (const group of groups.values()) {
      for (const command of group.getSubcommands().values()) {
        commands++;
        const options = command.toJSON().options as {
          name: string;
          required?: boolean;
          type: number;
          autocomplete?: boolean;
        }[];
        let optionalSeen = false;
        for (const option of options) {
          if (!option.required) optionalSeen = true;
          else expect(optionalSeen).toBe(false);
          if (['set', 'phrase'].includes(option.name)) {
            expect(option.type).toBe(ApplicationCommandOptionType.String);
            expect(option.autocomplete).toBe(true);
          }
        }
      }
    }
    expect(commands).toBe(14);
    const show = groups.get('set')!.getSubcommand('show').toJSON();
    expect((show.options as { name: string }[]).map((o) => o.name)).toEqual([
      'set',
      'page',
    ]);
    const edit = groups.get('phrase')!.getSubcommand('edit').toJSON();
    expect((edit.options as { name: string }[]).map((o) => o.name)).toEqual([
      'set',
      'phrase',
      'text',
    ]);
  });
});
