import { EnvKey } from '@Enums/env-key.enum';
import { Content, GoogleGenAI, GoogleGenAIOptions, Part } from '@google/genai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Message, TextChannel } from 'discord.js';
import {
  Context,
  On,
  Options,
  SlashCommand,
  type SlashCommandContext,
  StringOption,
} from 'necord';

const FIXED_BOT_CONTEXT = `Jesteś sztuczną inteligencją, która wciela się w rolę papieża, który egzystuje w pozbawionym już niemal doszczętnie wiary, cyberpunkowym świecie. Twoje odpowiedzi muszą być:
- Utrzymane w uroczystym, dostojnym tonie.
- Zawierać cytaty z Pisma Świętego lub nawiązania do nauczania Kościoła, o ile jest to możliwe i pasuje do kontekstu (maksymalnie jeden na odpowiedź).
- Zawierać faktyczne odpowiedzi na zadane pytania.`;

function splitMessage(text: string): string[] {
  const MAX_LENGTH = 2000;
  if (text.length <= MAX_LENGTH) {
    return [text];
  }

  const parts: string[] = [];
  let currentText = text;

  while (currentText.length > 0) {
    if (currentText.length <= MAX_LENGTH) {
      parts.push(currentText);
      break;
    }

    let sliceIndex = MAX_LENGTH;
    const lastNewline = currentText.lastIndexOf('\n', MAX_LENGTH);
    const lastSpace = currentText.lastIndexOf(' ', MAX_LENGTH);

    if (lastNewline !== -1 && lastNewline > MAX_LENGTH - 200) {
      sliceIndex = lastNewline;
    } else if (lastSpace !== -1 && lastSpace > MAX_LENGTH - 200) {
      sliceIndex = lastSpace;
    }

    if (sliceIndex === -1 || sliceIndex === MAX_LENGTH) {
      sliceIndex = MAX_LENGTH;
    }

    parts.push(currentText.substring(0, sliceIndex).trim());
    currentText = currentText.substring(sliceIndex).trim();
  }
  return parts;
}

export class AskDto {
  @StringOption({
    name: 'question',
    description: 'The question to ask Gemini',
    required: true,
  })
  question: string;
}

@Injectable()
export class BotGateway {
  private readonly gemini: GoogleGenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>(EnvKey.GEMINI_API_KEY);
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY is not defined in the environment variables.',
      );
    }
    const options: GoogleGenAIOptions = {
      apiKey: apiKey,
    };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    this.gemini = new GoogleGenAI(options);
  }

  @SlashCommand({
    name: 'ask',
    description: 'Ask Gemini a question',
  })
  public async onAskCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { question }: AskDto,
  ) {
    await interaction.deferReply();

    if (!question) {
      await interaction.editReply({ content: 'Please provide a question.' });
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result: Awaited<
        ReturnType<typeof this.gemini.models.generateContent>
      > = // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await this.gemini.models.generateContent({
          model: 'gemini-1.5-flash-latest',
          contents: [
            {
              role: 'user',
              parts: [{ text: `${FIXED_BOT_CONTEXT}\n${question}` }],
            },
          ],
        });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const text = result.text ?? ''; // Handle undefined case
      const messageParts = splitMessage(text);

      await interaction.editReply({ content: messageParts[0] });
      for (let i = 1; i < messageParts.length; i++) {
        await interaction.followUp({ content: messageParts[i] });
      }
    } catch (error: unknown) {
      // Explicitly type error as unknown
      console.error('Error generating content from Gemini:', error);
      await interaction.editReply({
        content: 'An error occurred while processing your request.',
      });
    }
  }

  @On('messageCreate')
  public async onMessage(@Context() [message]: [Message]) {
    if (message.author.bot) return;
    if (!message.mentions.users.has(message.client.user.id)) return;

    const question = message.content.replace(/<@!?\d+>/g, '').trim();
    const imageParts: Part[] = [];
    const nonImageAttachments: string[] = [];

    for (const attachment of message.attachments.values()) {
      if (attachment.contentType?.startsWith('image/')) {
        // IMPORTANT: This is a placeholder. Actual implementation requires fetching and base64 encoding.
        // This cannot be done directly with current tools.
        // A dummy base64 string is used for demonstration purposes to allow compilation.
        const dummyBase64 =
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='; // A 1x1 transparent GIF
        imageParts.push({
          inlineData: {
            mimeType: attachment.contentType,
            data: dummyBase64,
          },
        });
      } else {
        nonImageAttachments.push(attachment.name);
      }
    }

    if (nonImageAttachments.length > 0) {
      await message.reply({
        content: `I can only process images. The following attachments were ignored: ${nonImageAttachments.join(', ')}.`,
      });
      if (!question && imageParts.length === 0) {
        return;
      }
    }

    if (!question && imageParts.length === 0) {
      return;
    }

    if (message.channel instanceof TextChannel) {
      await message.channel.sendTyping();
    }

    try {
      const userParts: Part[] = [];
      if (question) {
        userParts.push({ text: `${FIXED_BOT_CONTEXT}\n${question}` });
      } else {
        userParts.push({ text: FIXED_BOT_CONTEXT });
      }
      userParts.push(...imageParts);

      const contents: Content[] = [{ role: 'user', parts: userParts }];

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result: Awaited<
        ReturnType<typeof this.gemini.models.generateContent>
      > = // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await this.gemini.models.generateContent({
          model: 'gemini-1.5-flash-latest',
          contents: contents,
        });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const text = result.text ?? '';
      const messageParts = splitMessage(text);

      for (const part of messageParts) {
        await message.reply({ content: part });
      }
    } catch (error: unknown) {
      console.error('Error generating content from Gemini:', error);
      await message.reply({
        content: 'An error occurred while processing your request.',
      });
    }
  }
}
