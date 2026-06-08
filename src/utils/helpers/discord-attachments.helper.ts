import { ERROR_CODE_MESSAGE_MAP } from '@Constants/error-messages.constant';
import { ErrorCode } from '@Enums/error-code.enum';
import { Part } from '@google/generative-ai';
import { Logger } from '@nestjs/common';
import axios from 'axios';
import { Attachment } from 'discord.js';
import { err, ok, Result } from 'neverthrow';
import sharp from 'sharp';

const IMAGE_DEFAULT_DIMENSION = 1024;
const IMAGE_JPEG_DEFAULT_QUALITY = 80;

export class DiscordAttachmentsHelper {
  private static logger = new Logger(DiscordAttachmentsHelper.name);

  static filterImages(attachments: Attachment[]): Attachment[] {
    return attachments.filter((attachment) =>
      attachment.contentType?.startsWith('image/'),
    );
  }

  private static async compressImage(
    buffer: Buffer,
    dimensions: number = IMAGE_DEFAULT_DIMENSION,
    quality: number = IMAGE_JPEG_DEFAULT_QUALITY,
  ): Promise<Result<{ data: Buffer; mimeType: string }, ErrorCode>> {
    const isMaxDimensionValid = dimensions > 0 && dimensions <= 2048;

    if (!isMaxDimensionValid) {
      return err(ErrorCode.IMAGE_COMPRESSION_WRONG_DIMENSIONS);
    }

    const isQualityValid = quality > 0 && quality <= 100;

    if (!isQualityValid) {
      return err(ErrorCode.IMAGE_COMPRESSION_WRONG_QUALITY);
    }

    const compressed = await sharp(buffer)
      .resize(dimensions, dimensions, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality })
      .toBuffer();

    return ok({ data: compressed, mimeType: 'image/jpeg' });
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

  static async convertImageUrlsToGeminiParts(urls: string[]): Promise<Part[]> {
    const geminiParts: Part[] = [];

    for (const url of urls) {
      try {
        const response = await axios.get<ArrayBuffer>(url, {
          responseType: 'arraybuffer',
        });
        const raw = Buffer.from(response.data);
        const compressed = await this.compressImage(raw);

        if (compressed.isErr()) {
          this.logger.error(ERROR_CODE_MESSAGE_MAP[compressed.error]);
          continue;
        }

        const { data, mimeType } = compressed.value;
        geminiParts.push({
          inlineData: { mimeType, data: data.toString('base64') },
        });
      } catch (error) {
        this.logger.error(`Error fetching image URL: ${error}`);
      }
    }

    return geminiParts;
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
        const raw = Buffer.from(response.data);
        const compressed = await this.compressImage(raw);

        if (compressed.isErr()) {
          this.logger.error(ERROR_CODE_MESSAGE_MAP[compressed.error]);
          continue;
        }

        const { data, mimeType } = compressed.value;
        geminiParts.push({
          inlineData: {
            mimeType,
            data: data.toString('base64'),
          },
        });
      } catch (error) {
        this.logger.error(`Error converting image to base64: ${error}`);
      }
    }

    return geminiParts;
  }
}
