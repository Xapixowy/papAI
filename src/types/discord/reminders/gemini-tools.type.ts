export type CreateReminderArgs = {
  content: string;
  date?: string;
  time: string;
};

export type CancelReminderArgs = {
  content_hint: string;
};
