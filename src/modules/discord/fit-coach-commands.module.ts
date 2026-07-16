import { FitCoachCommandsController } from '@Controllers/discord/fit-coach-commands.controller';
import { FitCoachMealCommandsController } from '@Controllers/discord/fit-coach/meal-commands.controller';
import { FitCoachSettingsCommandsController } from '@Controllers/discord/fit-coach/settings-commands.controller';
import { FitCoachSummaryCommandsController } from '@Controllers/discord/fit-coach/summary-commands.controller';
import { GeminiModule } from '@Modules/api/gemini.module';
import { NutritionLookupModule } from '@Modules/api/nutrition-lookup.module';
import { DiscordMessageModule } from '@Modules/discord-message.module';
import { FitCoachMealsModule } from '@Modules/fit-coach-meals.module';
import { FitCoachUserSettingsModule } from '@Modules/fit-coach-user-settings.module';
import { Module } from '@nestjs/common';
import { FitCoachCommandsService } from '@Services/discord/fit-coach-commands.service';
import { FitCoachCommandRegistrationService } from '@Services/discord/fit-coach/fit-coach-command-registration.service';
import { FitCoachGeminiToolsService } from '@Services/discord/fit-coach/gemini-tools.service';
import { FitCoachEmbedBuilderService } from '@Services/discord/fit-coach/fit-coach-embed-builder.service';
import { FitCoachMessageIntentHandlerService } from '@Services/discord/fit-coach/fit-coach-message-intent-handler.service';
import { GatewayIntentBits } from 'discord.js';
import { BaseCommandsModule } from './base-commands.module';
import { EmbedBuilderModule } from './services/embed-builder.module';

@Module({
  imports: [
    EmbedBuilderModule,
    GeminiModule,
    NutritionLookupModule,
    FitCoachMealsModule,
    FitCoachUserSettingsModule,
    DiscordMessageModule,
  ],
  providers: [
    FitCoachCommandsService,
    FitCoachCommandRegistrationService,
    FitCoachGeminiToolsService,
    FitCoachEmbedBuilderService,
    FitCoachMessageIntentHandlerService,
    FitCoachCommandsController,
    FitCoachMealCommandsController,
    FitCoachSummaryCommandsController,
    FitCoachSettingsCommandsController,
  ],
  exports: [FitCoachMessageIntentHandlerService],
})
export class FitCoachCommandsModule extends BaseCommandsModule {
  static get botIntents(): GatewayIntentBits[] {
    return [
      ...FitCoachCommandsController.botIntents,
      ...FitCoachMealCommandsController.botIntents,
      ...FitCoachSummaryCommandsController.botIntents,
      ...FitCoachSettingsCommandsController.botIntents,
    ];
  }
}
