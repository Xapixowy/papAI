import { ForbiddenException } from '@nestjs/common';

export class DiscordUserRoleForbiddenException extends ForbiddenException {
  public silentRejection: boolean;

  constructor(message: string, silentRejection: boolean = false) {
    super(message);
    this.silentRejection = silentRejection;
  }
}
