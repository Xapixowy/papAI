import {
  DownloadProtocol,
  QueueStatus,
  TrackedDownloadState,
  TrackedDownloadStatus,
} from '@Enums/radarr/movie';
import { CustomFormat } from './custom-format.type';
import { Language } from './language.type';
import { Movie } from './movie.type';
import { QualityModel } from './quality-model.type';
import { TrackedDownloadStatusMessage } from './tracked-download-status-message.type';

export type QueueRecord = {
  id: number;
  movieId: number;
  movie?: Movie;
  languages?: Language[];
  quality: QualityModel;
  customFormats?: CustomFormat[];
  customFormatScore: number;
  size: number;
  title?: string;
  estimatedCompletionTime?: string;
  added?: string;
  status: QueueStatus;
  trackedDownloadStatus: TrackedDownloadStatus;
  trackedDownloadState: TrackedDownloadState;
  statusMessages?: TrackedDownloadStatusMessage[];
  errorMessage?: string;
  downloadId?: string;
  protocol: DownloadProtocol;
  downloadClient?: string;
  downloadClientHasPostImportCategory: boolean;
  indexer?: string;
  outputPath?: string;
};
