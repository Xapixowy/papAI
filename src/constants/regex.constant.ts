export const REGEX_EMOJI = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu;
export const REGEX_DISCORD_EMOJI = /<a?:(\w+):(\d+)>/g;
export const REGEX_HH_MM_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const REGEX_IANA_TIMEZONE =
  /^(UTC|GMT|[A-Za-z_]+\/[A-Za-z0-9_+-]+(\/[A-Za-z0-9_+-]+)?)$/;
