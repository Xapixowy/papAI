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
  movie: Movie;
  languages: Language[] | null;
  quality: QualityModel;
  customFormats: CustomFormat[] | null;
  customFormatScore: number;
  size: number;
  title: string | null;
  estimatedCompletionTime: string | null;
  added: string | null;
  status: QueueStatus;
  trackedDownloadStatus: TrackedDownloadStatus;
  trackedDownloadState: TrackedDownloadState;
  statusMessages: TrackedDownloadStatusMessage[] | null;
  errorMessage: string | null;
  downloadId: string | null;
  protocol: DownloadProtocol;
  downloadClient: string | null;
  downloadClientHasPostImportCategory: boolean;
  indexer: string | null;
  outputPath: string | null;
};
