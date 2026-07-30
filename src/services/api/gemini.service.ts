import { ErrorCode } from '@Enums/error-code.enum';
import { Content, FunctionCall, GoogleGenAI, Part, Tool } from '@google/genai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { err, ok, Result } from 'neverthrow';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private gemini: GoogleGenAI | null = null;

  constructor(private readonly configService: ConfigService) {
    this.gemini = this.initializeGemini();
  }

  async generateContent({
    systemPrompt,
    queryParts,
    conversationHistory = [],
  }: {
    systemPrompt: string;
    queryParts: Part[];
    conversationHistory?: Content[];
  }): Promise<Result<string, ErrorCode>> {
    if (!this.gemini) {
      return err(ErrorCode.GEMINI_INITIALIZATION_ERROR);
    }

    try {
      const textGenerationModelName =
        this.configService.get<string>('gemini.modelName');

      if (!textGenerationModelName) {
        return err(ErrorCode.GEMINI_MODEL_NOT_FOUND);
      }

      const contents: Content[] = [
        ...conversationHistory,
        { role: 'user', parts: queryParts },
      ];

      this.logger.log('Generating content from Gemini...');
      const response = await this.gemini.models.generateContent({
        model: textGenerationModelName,
        contents,
        config: { systemInstruction: systemPrompt },
      });

      if (!response.candidates || response.candidates.length === 0) {
        this.logger.error('Error generating content from Gemini');
        return err(ErrorCode.GEMINI_GENERATION_ERROR);
      }

      const text = response.text ?? '';
      this.logger.log(
        `Content generated from Gemini: ${text.length} characters`,
      );
      return ok(text);
    } catch (error) {
      this.logger.error('Error generating content from Gemini:', error);
      return err(ErrorCode.GEMINI_GENERATION_ERROR);
    }
  }

  async generateContentWithTools({
    systemPrompt,
    queryParts,
    tools,
  }: {
    systemPrompt: string;
    queryParts: Part[];
    tools: Tool[];
  }): Promise<
    Result<
      | { text: string }
      | { functionCalls: FunctionCall[]; modelContent: Content },
      ErrorCode
    >
  > {
    if (!this.gemini) {
      return err(ErrorCode.GEMINI_INITIALIZATION_ERROR);
    }

    try {
      const textGenerationModelName =
        this.configService.get<string>('gemini.modelName');

      if (!textGenerationModelName) {
        return err(ErrorCode.GEMINI_MODEL_NOT_FOUND);
      }

      const contents: Content[] = [{ role: 'user', parts: queryParts }];

      this.logger.log('Generating content from Gemini (with tools)...');
      const response = await this.gemini.models.generateContent({
        model: textGenerationModelName,
        contents,
        config: { systemInstruction: systemPrompt, tools },
      });

      if (!response.candidates || response.candidates.length === 0) {
        this.logger.error('Error generating content from Gemini');
        return err(ErrorCode.GEMINI_GENERATION_ERROR);
      }

      const functionCalls = response.functionCalls;

      if (functionCalls && functionCalls.length > 0) {
        this.logger.log(
          `Gemini requested function calls: ${functionCalls.map((f) => f.name).join(', ')}`,
        );
        const modelContent = response.candidates[0].content!;
        return ok({ functionCalls, modelContent });
      }

      const text = response.text ?? '';
      this.logger.log(
        `Content generated from Gemini: ${text.length} characters`,
      );
      return ok({ text });
    } catch (error) {
      this.logger.error('Error generating content from Gemini:', error);
      return err(ErrorCode.GEMINI_GENERATION_ERROR);
    }
  }

  async generateContentWithFunctionResponseAndTools({
    systemPrompt,
    queryParts,
    modelContent,
    functionCallName,
    functionResponse,
    tools,
  }: {
    systemPrompt: string;
    queryParts: Part[];
    modelContent: Content;
    functionCallName: string;
    functionResponse: unknown;
    tools: Tool[];
  }): Promise<
    Result<
      | { text: string }
      | { functionCalls: FunctionCall[]; modelContent: Content },
      ErrorCode
    >
  > {
    if (!this.gemini) {
      return err(ErrorCode.GEMINI_INITIALIZATION_ERROR);
    }

    try {
      const textGenerationModelName =
        this.configService.get<string>('gemini.modelName');

      if (!textGenerationModelName) {
        return err(ErrorCode.GEMINI_MODEL_NOT_FOUND);
      }

      const contents: Content[] = [
        { role: 'user', parts: queryParts },
        modelContent,
        {
          role: 'function',
          parts: [
            {
              functionResponse: {
                name: functionCallName,
                response: { result: functionResponse },
              },
            },
          ],
        },
      ];

      this.logger.log(
        'Generating content from Gemini (function response + tools)...',
      );
      const response = await this.gemini.models.generateContent({
        model: textGenerationModelName,
        contents,
        config: { systemInstruction: systemPrompt, tools },
      });

      if (!response.candidates || response.candidates.length === 0) {
        return err(ErrorCode.GEMINI_GENERATION_ERROR);
      }

      const functionCalls = response.functionCalls;

      if (functionCalls && functionCalls.length > 0) {
        this.logger.log(
          `Gemini requested function calls: ${functionCalls.map((f) => f.name).join(', ')}`,
        );
        const nextModelContent = response.candidates[0].content!;
        return ok({ functionCalls, modelContent: nextModelContent });
      }

      return ok({ text: response.text ?? '' });
    } catch (error) {
      this.logger.error(
        'Error generating content from Gemini (function response + tools):',
        error,
      );
      return err(ErrorCode.GEMINI_GENERATION_ERROR);
    }
  }

  async generateContentWithFunctionResponse({
    systemPrompt,
    queryParts,
    modelContent,
    functionCallName,
    functionResponse,
  }: {
    systemPrompt: string;
    queryParts: Part[];
    modelContent: Content;
    functionCallName: string;
    functionResponse: unknown;
  }): Promise<Result<string, ErrorCode>> {
    if (!this.gemini) {
      return err(ErrorCode.GEMINI_INITIALIZATION_ERROR);
    }

    try {
      const textGenerationModelName =
        this.configService.get<string>('gemini.modelName');

      if (!textGenerationModelName) {
        return err(ErrorCode.GEMINI_MODEL_NOT_FOUND);
      }

      const contents: Content[] = [
        { role: 'user', parts: queryParts },
        modelContent,
        {
          role: 'function',
          parts: [
            {
              functionResponse: {
                name: functionCallName,
                response: { result: functionResponse },
              },
            },
          ],
        },
      ];

      this.logger.log('Generating content from Gemini (function response)...');
      const response = await this.gemini.models.generateContent({
        model: textGenerationModelName,
        contents,
        config: { systemInstruction: systemPrompt },
      });

      if (!response.candidates || response.candidates.length === 0) {
        this.logger.error('Error generating content from Gemini');
        return err(ErrorCode.GEMINI_GENERATION_ERROR);
      }

      const text = response.text ?? '';
      this.logger.log(
        `Content generated from Gemini: ${text.length} characters`,
      );
      return ok(text);
    } catch (error) {
      this.logger.error('Error generating content from Gemini:', error);
      return err(ErrorCode.GEMINI_GENERATION_ERROR);
    }
  }

  private initializeGemini(): GoogleGenAI | null {
    const apiKey = this.configService.get<string>('gemini.apiKey');

    if (!apiKey) {
      this.logger.error(
        'GEMINI_API_KEY is not defined in the environment variables.',
      );
      return null;
    }

    try {
      this.gemini = new GoogleGenAI({ apiKey });
      return this.gemini;
    } catch (error) {
      this.logger.error('Error initializing Gemini:', error);
      return null;
    }
  }
}
