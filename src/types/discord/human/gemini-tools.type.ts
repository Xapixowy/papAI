export type SearchSavedMessagesArgs = {
  keyword?: string;
  author_name?: string;
  channel_id?: string;
  date_from?: string;
  date_to?: string;
  has_attachments?: boolean;
  limit?: number;
};
