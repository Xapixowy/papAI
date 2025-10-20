import { ErrorCode } from '@Enums/error-code.enum';
import {
  Content,
  GenerateContentRequest,
  GoogleGenerativeAI,
  Part,
} from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { err, ok, Result } from 'neverthrow';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private gemini: GoogleGenerativeAI | null = null;

  constructor(private readonly configService: ConfigService) {
    this.gemini = this.initializeGemini();
  }

  async generateContent({
    systemPrompt,
    queryParts,
  }: {
    systemPrompt: string;
    queryParts: Part[];
  }): Promise<Result<string, ErrorCode>> {
    if (!this.gemini) {
      return err(ErrorCode.GEMINI_INITIALIZATION_ERROR);
    }

    try {
      const textGenerationModelName = this.configService.get<string>(
        'gemini.modelNames.textGeneration',
      );

      if (!textGenerationModelName) {
        return err(ErrorCode.GEMINI_MODEL_NOT_FOUND);
      }

      const model = this.gemini.getGenerativeModel({
        model: textGenerationModelName,
        systemInstruction: systemPrompt,
      });

      const contents: Content[] = [{ role: 'user', parts: queryParts }];
      const request: GenerateContentRequest = { contents };

      this.logger.log('Generating content from Gemini...');
      const result = await model.generateContent(request);
      const response = result.response;

      if (!response) {
        this.logger.error('Error generating content from Gemini');
        return err(ErrorCode.GEMINI_GENERATION_ERROR);
      }

      this.logger.log(
        `Content generated from Gemini: ${response.text().length} characters`,
      );
      return ok(response.text());
    } catch (error) {
      this.logger.error('Error generating content from Gemini:', error);
      return err(ErrorCode.GEMINI_GENERATION_ERROR);
    }
  }

  private initializeGemini(): GoogleGenerativeAI | null {
    const apiKey = this.configService.get<string>('gemini.apiKey');

    if (!apiKey) {
      this.logger.error(
        'GEMINI_API_KEY is not defined in the environment variables.',
      );
      return null;
    }

    try {
      this.gemini = new GoogleGenerativeAI(apiKey);
      return this.gemini;
    } catch (error) {
      this.logger.error('Error initializing Gemini:', error);
      return null;
    }
  }
}
