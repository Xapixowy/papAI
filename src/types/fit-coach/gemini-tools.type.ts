export type ProposeMealArgs = {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  meal_type?: string;
  date?: string;
  time?: string;
  confidence_note?: string;
  estimated_components?: Array<{
    name: string;
    portion_grams: number;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  }>;
};

export type GetPeriodSummaryArgs = {
  period: 'week' | 'month' | 'year';
  date?: string;
};

export type SearchUserMessagesArgs = {
  keyword?: string;
  date_from?: string;
  date_to?: string;
  has_attachments?: boolean;
  limit?: number;
};

export type LookupNutritionArgs = {
  query: string;
  portion_grams: number;
  portion_description?: string;
};

export type LookupNutritionBatchArgs = {
  components: Array<{
    query: string;
    portion_grams: number;
  }>;
  meal_name: string;
};
