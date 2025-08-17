import { GuildMember } from 'discord.js';
import { MemberOption } from 'necord';

export class UserOption {
  @MemberOption({
    name: 'user',
    description: 'Discord user',
    required: true,
  })
  user: GuildMember;
}
