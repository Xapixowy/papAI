import { SortDirection } from '@Enums/radarr/movie';
import { QueueRecord } from '@Types/radarr';

export type QueueResponse = {
  page: number;
  pageSize: number;
  sortKey: string | null;
  sortDirection: SortDirection;
  totalRecords: number;
  records: QueueRecord[] | null;
};
