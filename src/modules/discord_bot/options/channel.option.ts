import { GuildChannel } from 'discord.js';
import { ChannelOption as ChannelOptionDecorator } from 'necord';

export class ChannelOption {
  @ChannelOptionDecorator({
    name: 'channel',
    description: 'Channel',
    required: true,
  })
  channel: GuildChannel;
}
