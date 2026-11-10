import { BooleanOption, ChannelOption, StringOption } from 'necord';
import { ChannelType, GuildChannel } from 'discord.js';
import { EphemeralOption } from '@Options/ephemeral.option';

export class WowCharacterOption extends EphemeralOption {
  @StringOption({
    name: 'character',
    description: 'Name Surname or a Forever EU Armory profile URL',
    required: false,
    max_length: 300,
  })
  character: string | null;
}

export class WowAddObserverOption {
  @StringOption({
    name: 'character',
    description: 'Name Surname or a Forever EU Armory profile URL',
    required: true,
    max_length: 300,
  })
  character: string;
}

export class WowRemoveObserverOption {
  @StringOption({
    name: 'id',
    description: 'Observer ID from /wow observer list',
    required: true,
  })
  id: string;
}

export class WowChannelOption {
  @ChannelOption({
    name: 'channel',
    description: 'Notification channel on this server',
    required: true,
    channel_types: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
  })
  channel: GuildChannel;
}

export class WowAllowedChannelOption extends WowChannelOption {
  @BooleanOption({
    name: 'enabled',
    description: 'Allow character observations on this channel',
    required: true,
  })
  enabled: boolean;
}
