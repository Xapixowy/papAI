import { SchemaType, Tool } from '@google/generative-ai';

export const GET_CONVERSATION_HISTORY_TOOL_NAME = 'get_conversation_history';
export const SEARCH_SAVED_MESSAGES_TOOL_NAME = 'search_saved_messages';

export const HUMAN_GEMINI_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: GET_CONVERSATION_HISTORY_TOOL_NAME,
        description:
          'Retrieves previous messages from this channel with author names and timestamps (UTC). You MUST call this tool whenever the request involves any of the following: summarizing or analyzing what a specific person or user wrote; questions about channel history or past messages; follow-up questions referencing earlier parts of the conversation; requests mentioning a specific date or time; any task that requires knowing what was previously said by anyone in this channel. When in doubt, call this tool.',
      },
      {
        name: SEARCH_SAVED_MESSAGES_TOOL_NAME,
        description:
          'Searches saved messages across the server by keyword, author name, channel, date range, or attachment presence. Use this when the user wants to find specific messages, search for what someone said, look up messages by date, or filter by attachments. Results include author username and timestamp.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            keyword: {
              type: SchemaType.STRING,
              description:
                'Search for messages containing this text (case-insensitive).',
            },
            author_name: {
              type: SchemaType.STRING,
              description:
                'Filter by message author. Accepts: a Discord mention (e.g. "<@123456>"), a raw user ID, a display name, a server nickname, or a username — resolved against server members (partial match, case-insensitive).',
            },
            channel_id: {
              type: SchemaType.STRING,
              description:
                'Filter by channel. Accepts: a channel mention (e.g. "<#123456>"), a raw channel ID, or a channel name — resolved against server channels (partial match, case-insensitive).',
            },
            date_from: {
              type: SchemaType.STRING,
              description:
                'Filter messages sent on or after this date (ISO 8601, e.g. 2026-05-25 or 2026-05-25T11:00:00Z).',
            },
            date_to: {
              type: SchemaType.STRING,
              description:
                'Filter messages sent on or before this date (ISO 8601).',
            },
            has_attachments: {
              type: SchemaType.BOOLEAN,
              description:
                'If true, return only messages with attachments. If false, return only messages without attachments.',
            },
            limit: {
              type: SchemaType.NUMBER,
              description:
                'Maximum number of results to return (default 20, max 50).',
            },
          },
        },
      },
    ],
  },
];
