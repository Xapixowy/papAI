import { describe, expect, it, jest } from '@jest/globals';
import { Reflector } from '@nestjs/core';
import {
  SlashCommandDiscovery,
  SlashCommandsService,
  Subcommand,
} from 'necord';
import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import {
  WowCommandsController,
  replyWow,
} from '@Controllers/discord/wow-commands.controller';
import { WowObserverCommandsController } from '@Controllers/discord/wow/wow-observer-commands.controller';
import { WowConfigCommandsController } from '@Controllers/discord/wow/wow-config-commands.controller';
import { WowCommandsService } from '@Services/wow/wow-commands.service';
import { EmbedBuilder } from 'discord.js';

describe('WoW command contract', () => {
  it('discovers all commands and preserves required-before-optional option order', () => {
    const reflector = new Reflector();
    const registry = new SlashCommandsService(reflector);
    for (const controller of [
      WowCommandsController,
      WowObserverCommandsController,
      WowConfigCommandsController,
    ]) {
      for (const name of Object.getOwnPropertyNames(controller.prototype)) {
        const handler = Object.getOwnPropertyDescriptor(
          controller.prototype,
          name,
        )?.value as ((...args: unknown[]) => unknown) | undefined;
        if (!handler) continue;
        const command = reflector.get<SlashCommandDiscovery>(
          Subcommand.KEY,
          handler,
        );
        if (!command) continue;
        command.setDiscoveryMeta({ class: controller, handler });
        registry.addSubCommand(command);
      }
    }
    const root = registry.get('wow');
    expect(
      root
        .getSubcommands()
        .map((c) => c.getName())
        .sort(),
    ).toEqual(['character', 'config', 'observer', 'status']);
    const character = root.getSubcommand('character');
    const options = character.getOptions() as { name: string }[];
    expect(options.map((o) => o.name)).toEqual(['character', 'ephemeral']);
    expect(character.getRawOptions().character.required).toBe(false);
    const addOptions = root
      .getSubcommand('observer')
      .getSubcommand('add')
      .getOptions() as { name: string; required?: boolean }[];
    expect(
      addOptions.map((o) => ({ name: o.name, required: o.required })),
    ).toEqual([{ name: 'character', required: true }]);
    expect(
      root
        .getSubcommand('observer')
        .getSubcommands()
        .map((c) => c.getName())
        .sort(),
    ).toEqual(['add', 'list', 'remove']);
    expect(
      root
        .getSubcommand('config')
        .getSubcommands()
        .map((c) => c.getName())
        .sort(),
    ).toEqual(['character-channel', 'status-channel', 'status-disable']);
  });

  it('defaults checks to ephemeral and honors ephemeral=false', async () => {
    const commands = Object.create(
      WowCommandsService.prototype,
    ) as WowCommandsService;
    jest.spyOn(commands, 'execute').mockImplementation((action) => action());
    const interaction = {
      guildId: '100000000000000001',
      deferReply: jest.fn<() => Promise<void>>().mockResolvedValue(),
      editReply: jest.fn<() => Promise<void>>().mockResolvedValue(),
      followUp: jest.fn<() => Promise<void>>().mockResolvedValue(),
    };
    const action = () =>
      Promise.resolve([new EmbedBuilder().setDescription('test')]);
    await replyWow(
      commands,
      interaction as unknown as ChatInputCommandInteraction,
      action,
    );
    expect(interaction.deferReply).toHaveBeenLastCalledWith({
      flags: MessageFlags.Ephemeral,
    });
    await replyWow(
      commands,
      interaction as unknown as ChatInputCommandInteraction,
      action,
      false,
    );
    expect(interaction.deferReply).toHaveBeenLastCalledWith({
      flags: undefined,
    });
  });
});
