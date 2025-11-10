import { ForbiddenException } from '@nestjs/common';

export class DiscordUserRoleForbiddenException extends ForbiddenException {
  constructor(message: string) {
    super(message);
  }
}
