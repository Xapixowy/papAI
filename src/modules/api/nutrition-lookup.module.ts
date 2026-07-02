import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { NutritionLookupService } from '@Services/api/nutrition-lookup.service';

@Module({
  imports: [HttpModule.register({ timeout: 5000, maxRedirects: 3 })],
  providers: [NutritionLookupService],
  exports: [NutritionLookupService],
})
export class NutritionLookupModule {}
