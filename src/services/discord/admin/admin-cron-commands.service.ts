import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { EmbedBuilder } from 'discord.js';
import { AdminEmbedBuilderService } from './admin-embed-builder.service';

@Injectable()
export class AdminCronCommandsService {
  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly embedBuilderService: AdminEmbedBuilderService,
  ) {}

  listHandler(): EmbedBuilder {
    const cronJobs = this.schedulerRegistry.getCronJobs();

    const jobs = [...cronJobs.entries()].map(([name, job]) => ({
      name,
      nextRun: job.nextDate().toISO() ?? 'unknown',
      lastRun: job.lastDate()?.toISOString() ?? null,
    }));

    return this.embedBuilderService.cronList(jobs);
  }
}
