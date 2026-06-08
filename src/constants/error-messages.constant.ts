import { ErrorCode } from '@Enums/error-code.enum';

export const ERROR_CODE_MESSAGE_MAP: Record<ErrorCode, string> = {
  [ErrorCode.DISCORD_USER_NOT_FOUND]: 'User not found.',
  [ErrorCode.DISCORD_USER_EXISTS]: 'User already exists.',
  [ErrorCode.DISCORD_SETTING_NOT_FOUND]: 'Setting not found.',
  [ErrorCode.DISCORD_SETTING_EXISTS]: 'Setting already exists.',
  [ErrorCode.DISCORD_SETTING_CHATGPT_PAYMENT_DATE_NOT_FOUND]:
    'ChatGPT payment date not found.',
  [ErrorCode.DISCORD_SETTING_CHATGPT_PRICE_NOT_FOUND]:
    'ChatGPT price not found.',
  [ErrorCode.DISCORD_SETTING_CHATGPT_CURRENCY_NOT_FOUND]:
    'ChatGPT currency not found.',
  [ErrorCode.DISCORD_CHATGPT_TRANSACTION_NOT_FOUND]:
    'ChatGPT transaction not found.',
  [ErrorCode.DISCORD_CHATGPT_TRANSACTION_EXISTS]:
    'ChatGPT transaction already exists.',
  [ErrorCode.DISCORD_CHATGPT_TRANSACTION_SUMMARY_NOT_FOUND]:
    'ChatGPT transaction summary not found.',
  [ErrorCode.DISCORD_CHATGPT_TRANSACTION_SUMMARY_EXISTS]:
    'ChatGPT transaction summary already exists.',
  [ErrorCode.DISCORD_CHATGPT_USERS_NOT_FOUND]: 'ChatGPT users not found.',
  [ErrorCode.DISCORD_CHANNEL_NOT_FOUND]: 'Channel not found.',
  [ErrorCode.DISCORD_CHANNEL_WRONG_TYPE]: 'Channel is not a text channel.',
  [ErrorCode.DISCORD_CHANNEL_EXISTS]: 'Channel already exists.',
  [ErrorCode.DISCORD_MESSAGES_NOT_FOUND]: 'Messages not found.',
  [ErrorCode.DISCORD_MESSAGE_NOT_FOUND]: 'Message not found.',
  [ErrorCode.TENOR_SEARCH_NOT_FOUND]: 'Tenor search not found.',
  [ErrorCode.GIPHY_SEARCH_NOT_FOUND]: 'Giphy search not found.',
  [ErrorCode.KLIPY_SEARCH_NOT_FOUND]: 'Klipy search not found.',
  [ErrorCode.GEMINI_INITIALIZATION_ERROR]: 'Gemini initialization error.',
  [ErrorCode.GEMINI_MODEL_NOT_FOUND]: 'Gemini model not found.',
  [ErrorCode.GEMINI_GENERATION_ERROR]: 'Gemini generation error.',
  [ErrorCode.DISCORD_GUILD_NOT_FOUND]: 'Guild not found.',
  [ErrorCode.DISCORD_GUILD_EXISTS]: 'Guild already exists.',
  [ErrorCode.DISCORD_GUILD_UNABLE_TO_CREATE]: 'Guild unable to create.',
  [ErrorCode.DISCORD_GUILD_UNABLE_TO_UPDATE]: 'Guild unable to update.',
  [ErrorCode.IMAGE_COMPRESSION_WRONG_DIMENSIONS]:
    'Image compression wrong dimensions.',
  [ErrorCode.IMAGE_COMPRESSION_WRONG_QUALITY]:
    'Image compression wrong quality.',
};
