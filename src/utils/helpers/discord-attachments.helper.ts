import { Part } from '@google/generative-ai';
import { Logger } from '@nestjs/common';
import axios from 'axios';
import { Attachment } from 'discord.js';

export class DiscordAttachmentsHelper {
  private static logger = new Logger(DiscordAttachmentsHelper.name);

  static filterImages(attachments: Attachment[]): Attachment[] {
    return attachments.filter((attachment) =>
      attachment.contentType?.startsWith('image/'),
    );
  }

  static async convertImagesToBase64(
    attachments: Attachment[],
  ): Promise<string[]> {
    const imagesAttachments = this.filterImages(attachments);

    if (imagesAttachments.length === 0) {
      return [];
    }

    const base64Images: string[] = [];

    for (const attachment of imagesAttachments) {
      try {
        const imageUrl = attachment.url;
        const response = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
        });
        const base64Data = Buffer.from(response.data, 'binary').toString(
          'base64',
        );

        base64Images.push(base64Data);
      } catch (error) {
        this.logger.error(`Error converting image to base64: ${error}`);
      }
    }

    return base64Images;
  }

  static async convertImagesToGeminiParts(
    attachments: Attachment[],
  ): Promise<Part[]> {
    const imagesAttachments = this.filterImages(attachments);

    if (imagesAttachments.length === 0) {
      return [];
    }

    const geminiParts: Part[] = [];

    for (const attachment of imagesAttachments) {
      try {
        const imageUrl = attachment.url;
        const response = await axios.get<ArrayBuffer>(imageUrl, {
          responseType: 'arraybuffer',
        });
        const base64Data = Buffer.from(response.data).toString('base64');

        geminiParts.push({
          inlineData: {
            mimeType: attachment.contentType!,
            data: base64Data,
          },
        });
      } catch (error) {
        this.logger.error(`Error converting image to base64: ${error}`);
      }
    }

    return geminiParts;
  }
}
