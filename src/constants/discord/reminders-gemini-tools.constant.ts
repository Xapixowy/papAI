import { SchemaType, Tool } from '@google/generative-ai';

export const CREATE_REMINDER_TOOL_NAME = 'create_reminder';
export const CANCEL_REMINDER_TOOL_NAME = 'cancel_reminder';

export const REMINDERS_GEMINI_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: CREATE_REMINDER_TOOL_NAME,
        description:
          'Schedules a reminder for the user. Call this whenever the user asks to be reminded about something, at a given time, optionally on a given day.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            content: {
              type: SchemaType.STRING,
              description:
                'What the user wants to be reminded about, written as a short, natural sentence (e.g. "zadzwonić do mamy").',
            },
            date: {
              type: SchemaType.STRING,
              description:
                'Date of the reminder in YYYY-MM-DD format, using the current date given above. Set this ONLY when the user specifies a day other than "whenever the time next occurs" — e.g. "jutro", "wczoraj", "w poniedziałek", "25 grudnia", "tomorrow", "next Monday". Leave unset if the user only gives a time (e.g. "o 18", "za 2 godziny") — in that case the reminder fires at the next upcoming occurrence of that time.',
            },
            time: {
              type: SchemaType.STRING,
              description:
                'Exact time of the reminder in HH:MM 24h format, resolved from whatever the user said (e.g. "18:30", "6pm", "za godzinę", "za 2 godziny", "rano", "wieczorem") using the current local time given above.',
            },
          },
          required: ['content', 'time'],
        },
      },
      {
        name: CANCEL_REMINDER_TOOL_NAME,
        description:
          "Cancels one of the user's pending reminders. Call this whenever the user asks to cancel, remove, or delete a reminder.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            content_hint: {
              type: SchemaType.STRING,
              description:
                'A keyword or short phrase from the reminder\'s content, used to find which pending reminder the user means (e.g. "zakupy", "mama").',
            },
          },
          required: ['content_hint'],
        },
      },
    ],
  },
];
