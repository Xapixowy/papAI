import { EmbedBuilderService } from '@Services/discord/embed-builder.service';
import { Module } from '@nestjs/common';

@Module({
  providers: [EmbedBuilderService],
  exports: [EmbedBuilderService],
})
export class EmbedBuilderModule {}
