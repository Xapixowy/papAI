import { SchemaType, Tool } from '@google/generative-ai';

export const FIT_COACH_LOOKUP_NUTRITION_TOOL_NAME = 'lookup_nutrition';
export const FIT_COACH_LOOKUP_NUTRITION_BATCH_TOOL_NAME =
  'lookup_nutrition_batch';
export const FIT_COACH_PROPOSE_MEAL_TOOL_NAME = 'propose_meal';
export const FIT_COACH_ANALYZE_PHOTO_TOOL_NAME = 'analyze_food_photo';
export const FIT_COACH_SEARCH_MESSAGES_TOOL_NAME = 'search_user_messages';
export const FIT_COACH_GET_MEAL_LIST_TOOL_NAME = 'get_meal_list';
export const FIT_COACH_GET_PERIOD_SUMMARY_TOOL_NAME = 'get_period_summary';

export const FIT_COACH_GEMINI_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: FIT_COACH_LOOKUP_NUTRITION_BATCH_TOOL_NAME,
        description:
          'Look up nutritional data for multiple food components separately, then sum the results. Use this for meals made of several distinct ingredients or items (e.g. sausage + bread roll + cheese + salad). Each component is looked up individually in nutrition databases for accuracy.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            meal_name: {
              type: SchemaType.STRING,
              description: 'Overall meal name for display purposes.',
            },
            components: {
              type: SchemaType.ARRAY,
              description: 'List of individual food components to look up.',
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  query: {
                    type: SchemaType.STRING,
                    description:
                      'English name of the component (e.g. "grilled pork sausage", "wheat bread roll", "halloumi cheese grilled").',
                  },
                  portion_grams: {
                    type: SchemaType.NUMBER,
                    description:
                      'Estimated weight of this component in grams. Err on the higher side — people consistently underestimate food weight in photos.',
                  },
                },
                required: ['query', 'portion_grams'],
              },
            },
          },
          required: ['meal_name', 'components'],
        },
      },
      {
        name: FIT_COACH_LOOKUP_NUTRITION_TOOL_NAME,
        description:
          'Look up accurate nutritional data for a single food item. Use for simple foods (one item, one ingredient). For multi-component meals, use lookup_nutrition_batch instead.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: {
              type: SchemaType.STRING,
              description:
                'English name of the food to search (e.g. "pizza margherita", "oatmeal with milk", "chicken breast grilled").',
            },
            portion_grams: {
              type: SchemaType.NUMBER,
              description:
                'Estimated portion weight in grams. Use realistic serving sizes and err on the higher side — people consistently underestimate food weight. Reference: 1 pizza slice ≈ 150-180g, bowl of oatmeal ≈ 250-300g, grilled sausage ≈ 150-200g, bread roll ≈ 80-110g, halloumi slice ≈ 80-120g, restaurant pasta ≈ 250-350g. Ask the user only if completely unclear.',
            },
            portion_description: {
              type: SchemaType.STRING,
              description:
                'Human-readable portion description, e.g. "2 slices of pizza (≈300g)".',
            },
          },
          required: ['query', 'portion_grams'],
        },
      },
      {
        name: FIT_COACH_PROPOSE_MEAL_TOOL_NAME,
        description:
          'Propose a meal entry for the user to confirm. Call this AFTER lookup_nutrition has returned values, using those values. Only use your own estimates if lookup_nutrition found nothing. After calling, the user will see a confirmation embed and must approve before saving.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            name: {
              type: SchemaType.STRING,
              description: 'Name of the meal or food item.',
            },
            calories: {
              type: SchemaType.NUMBER,
              description: 'Total calories (kcal).',
            },
            protein: {
              type: SchemaType.NUMBER,
              description: 'Protein in grams.',
            },
            fat: {
              type: SchemaType.NUMBER,
              description: 'Fat in grams.',
            },
            carbs: {
              type: SchemaType.NUMBER,
              description: 'Carbohydrates in grams.',
            },
            meal_type: {
              type: SchemaType.STRING,
              description:
                'Meal type: breakfast, second_breakfast, lunch, afternoon_snack, dinner, snack. Infer from context or message timestamp if not stated.',
            },
            date: {
              type: SchemaType.STRING,
              description:
                "Date of the meal in YYYY-MM-DD format using the user's local timezone. Set this ONLY when the meal did not happen today — e.g. user says 'yesterday', 'last night', 'on Monday'. During corrections, ALWAYS preserve the date from the current pending meal. Omit only if the meal is definitely today.",
            },
            time: {
              type: SchemaType.STRING,
              description:
                "Exact time of the meal in HH:MM 24h format using the user's local timezone. Set this ONLY when the user provides an explicit time (e.g. 'I ate at 21:37', 'it was around 9pm'). Omit otherwise — the system will use the meal type range start.",
            },
            estimated_components: {
              type: SchemaType.ARRAY,
              description:
                'Per-component nutritional estimates for ingredients NOT found in the database. Fill this ONLY when the function response includes a not_found list — provide one entry per not-found component in the same order.',
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  name: {
                    type: SchemaType.STRING,
                    description:
                      'Component name (match the name from not_found list).',
                  },
                  portion_grams: {
                    type: SchemaType.NUMBER,
                    description: 'Portion weight in grams.',
                  },
                  calories: {
                    type: SchemaType.NUMBER,
                    description: 'Estimated calories (kcal) for this portion.',
                  },
                  protein: {
                    type: SchemaType.NUMBER,
                    description: 'Estimated protein in grams.',
                  },
                  fat: {
                    type: SchemaType.NUMBER,
                    description: 'Estimated fat in grams.',
                  },
                  carbs: {
                    type: SchemaType.NUMBER,
                    description: 'Estimated carbohydrates in grams.',
                  },
                },
                required: [
                  'name',
                  'portion_grams',
                  'calories',
                  'protein',
                  'fat',
                  'carbs',
                ],
              },
            },
          },
          required: ['name', 'calories', 'protein', 'fat', 'carbs'],
        },
      },
      {
        name: FIT_COACH_ANALYZE_PHOTO_TOOL_NAME,
        description:
          'Analyze a food photo to identify the meal and estimate nutritional values. Call this when the user sends an image of food. For a single-item meal: provide name + portion_grams (system does a single DB lookup). For multi-component meals (e.g. plate with sausage, bread roll, and salad): provide a components array instead — the system will look up each item separately and sum the results for accuracy.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            name: {
              type: SchemaType.STRING,
              description:
                'Identified name of the food/meal in English. Required for single-item meals; for multi-component meals with components array, use the overall meal name.',
            },
            portion_grams: {
              type: SchemaType.NUMBER,
              description:
                'Estimated total portion weight in grams. For single-item meals only. Err on the higher side — people consistently underestimate food weight in photos.',
            },
            components: {
              type: SchemaType.ARRAY,
              description:
                'Individual food components for multi-ingredient meals. Provide this instead of a single portion_grams when the meal has several distinct items.',
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  query: {
                    type: SchemaType.STRING,
                    description: 'English name of the component.',
                  },
                  portion_grams: {
                    type: SchemaType.NUMBER,
                    description: 'Estimated weight of this component in grams.',
                  },
                },
                required: ['query', 'portion_grams'],
              },
            },
            calories: {
              type: SchemaType.NUMBER,
              description:
                'Estimated calories (kcal) — will be overridden by database if found.',
            },
            protein: {
              type: SchemaType.NUMBER,
              description: 'Estimated protein in grams.',
            },
            fat: {
              type: SchemaType.NUMBER,
              description: 'Estimated fat in grams.',
            },
            carbs: {
              type: SchemaType.NUMBER,
              description: 'Estimated carbohydrates in grams.',
            },
            meal_type: {
              type: SchemaType.STRING,
              description:
                'Meal type inferred from context or time: breakfast, second_breakfast, lunch, afternoon_snack, dinner, snack.',
            },
            date: {
              type: SchemaType.STRING,
              description:
                "Date of the meal in YYYY-MM-DD format using the user's local timezone. Set ONLY when the meal did not happen today — e.g. user says 'yesterday', 'last night'. Omit if the meal is today.",
            },
            time: {
              type: SchemaType.STRING,
              description:
                'Exact time in HH:MM 24h format. Set ONLY when user provides explicit time. Omit otherwise.',
            },
            confidence_note: {
              type: SchemaType.STRING,
              description:
                'Brief note about estimation confidence, e.g. "Portion size estimated based on typical serving".',
            },
          },
          required: ['name', 'calories', 'protein', 'fat', 'carbs'],
        },
      },
      {
        name: FIT_COACH_GET_MEAL_LIST_TOOL_NAME,
        description:
          'Show the user their logged meals for a specific day. Use when the user asks to see what they ate on a given day, requests a meal list, or wants to review their food log.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            date: {
              type: SchemaType.STRING,
              description:
                "Date to show meals for in YYYY-MM-DD format using the user's local timezone. Omit for today.",
            },
          },
        },
      },
      {
        name: FIT_COACH_GET_PERIOD_SUMMARY_TOOL_NAME,
        description:
          'Show a nutrition summary for a day, week, month, or year. Use when the user asks for a summary, overview, or recap of their eating for a given period.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            period: {
              type: SchemaType.STRING,
              description:
                'Period to summarize: "day", "week", "month", or "year".',
            },
            date: {
              type: SchemaType.STRING,
              description:
                "Any date within the desired period in YYYY-MM-DD format using the user's local timezone. Omit for the current period.",
            },
          },
          required: ['period'],
        },
      },
      {
        name: FIT_COACH_SEARCH_MESSAGES_TOOL_NAME,
        description:
          'Search through saved messages sent by this user across all servers. Use when the user wants to find something they previously said.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            keyword: {
              type: SchemaType.STRING,
              description:
                'Search for messages containing this text (case-insensitive).',
            },
            date_from: {
              type: SchemaType.STRING,
              description:
                'Filter messages sent on or after this date (ISO 8601).',
            },
            date_to: {
              type: SchemaType.STRING,
              description:
                'Filter messages sent on or before this date (ISO 8601).',
            },
            has_attachments: {
              type: SchemaType.BOOLEAN,
              description: 'If true, return only messages with attachments.',
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

export const FIT_COACH_SYSTEM_PROMPT = `You are the Cynical Helper — a world-weary, cold professional with a dry, blunt personality. You help users track meals, monitor nutrition, and maintain a healthy lifestyle. You protect the user's interests and treat them as an equal, responding to their ideas, jokes, or jabs with ironic, light detachment. In casual conversation you are extremely concise (typically 3-4 sentences), no fake warmth, no filler. This length rule does not apply when the user assigns a specific task (analysis, plans, detailed fitness questions) — then you go full depth without limits, delivering thorough content in dry, no-nonsense bullet points.

IMPORTANT RULES:
- Always respond in the same language the user writes in.
- When a user describes a NEW meal (not correcting an existing proposal): FIRST call lookup_nutrition or lookup_nutrition_batch, THEN call propose_meal using the returned values. This ensures accurate nutritional data from real databases. Never skip the lookup for new meals.
- If lookup_nutrition returns no data, fall back to your own estimate and include a confidence_note saying values are estimated.
- When correcting an EXISTING pending meal proposal (shown in context below): follow the CORRECTION RULES precisely — do not apply the "lookup first" rule blindly, some corrections (time change, direct calorie override) go straight to propose_meal.
- When a user sends a food photo, use analyze_food_photo. For a single-item meal: identify the food name in English and estimate portion_grams. For multi-component meals (plate with several distinct items like sausage + bread + salad): provide a components array with each item and its estimated grams — the system will look up each component separately for much better accuracy. Portion estimation guidance: people consistently underestimate food weight from photos — always err on the higher side. Reference: a standard European dinner plate is ~26cm diameter; a typical grilled sausage/kiełbasa is 150-200g; a bread roll is 80-110g; a slice of halloumi or cheese is 80-120g; a side salad is 100-150g; a full restaurant-sized portion of pasta or rice is 200-300g.
- If the user states an explicit weight in their message (e.g. "200g pasta", "half a kilo of chicken"), always use that exact value as portion_grams — do not estimate.
- If portion size is completely unclear and cannot be estimated, ask the user before calling lookup_nutrition.
- Never save data without user confirmation — always go through the proposal embed flow.
- When the user mentions a past date (yesterday, last night, Monday, etc.) set the \`date\` field in propose_meal AND in analyze_food_photo to the correct YYYY-MM-DD date in the user's local timezone so the meal is logged on the right day.
- When the user provides an explicit time (e.g. "I ate at 21:37", "it was around 9pm"): set the \`time\` field (HH:MM) in propose_meal. Also set \`date\` if the meal was not today.
- When correcting a pending meal, ALWAYS set \`date\` in propose_meal to match the original meal date. Never let corrections silently revert to today's date.
- When the user asks about their message history, use search_user_messages.
- When the user wants to see what they ate on a specific day (meal list, food log, what did I eat), use get_meal_list with the correct date.
- When the user asks for a nutrition summary or recap for any period (today, this week, last month, this year), use get_period_summary with the correct period and date.
- You can also handle general fitness conversations: exercise advice, nutrition tips, motivation.`;
