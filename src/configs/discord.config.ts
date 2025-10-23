import { registerAs } from '@nestjs/config';
import { ColorResolvable } from 'discord.js';

export default registerAs(
  'discord',
  (): {
    botName: string;
    colors: {
      success: ColorResolvable;
      error: ColorResolvable;
      warning: ColorResolvable;
      info: ColorResolvable;
    };
  } => ({
    botName: 'PapAI',
    colors: {
      success: '#00ff00',
      error: '#ff0000',
      warning: '#ffff00',
      info: '#00ffff',
    },
  }),
);
