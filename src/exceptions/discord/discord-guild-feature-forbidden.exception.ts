import { ForbiddenException } from '@nestjs/common';

export class DiscordGuildFeatureForbiddenException extends ForbiddenException {
  constructor(message: string) {
    super(message);
  }
}
