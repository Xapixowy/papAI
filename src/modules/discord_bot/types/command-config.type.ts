import { DiscordUserRole } from '@Enums/discord-user-role.enum';

export type CommandConfigCommand = {
  name: string;
  description: string;
  userRoles: DiscordUserRole[];
};

export type CommandConfigGroup<T extends CommandConfig> = {
  name: string;
  description: string;
  commands: Record<string, T>;
};

type CommandConfig =
  | CommandConfigGroup<CommandConfigCommand>
  | CommandConfigCommand;

export type CommandConfigParentGroup<T extends CommandConfig> =
  CommandConfigGroup<T> & {
    embed: {
      title: string;
      thumbnail?: string;
    };
  };
