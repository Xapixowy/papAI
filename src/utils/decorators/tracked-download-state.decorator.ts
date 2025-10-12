import { TrackedDownloadState } from '@Enums/radarr/movie';

export class TrackedDownloadStateDecorator {
  static decorateIcon(status: TrackedDownloadState): string {
    switch (status) {
      case TrackedDownloadState.IMPORTED:
        return '✅';
      case TrackedDownloadState.IMPORT_PENDING:
        return '⏳';
      case TrackedDownloadState.IMPORTING:
        return '🔄';
      case TrackedDownloadState.FAILED:
        return '❌';
      case TrackedDownloadState.FAILED_PENDING:
        return '⏳❗';
      case TrackedDownloadState.IGNORED:
        return '🚫';
      case TrackedDownloadState.DOWNLOADING:
        return '⬇️ ';
      default:
        return '❔';
    }
  }

  static decorateText(status: TrackedDownloadState): string {
    switch (status) {
      case TrackedDownloadState.IMPORTED:
        return 'Imported';
      case TrackedDownloadState.IMPORT_PENDING:
        return 'Import pending';
      case TrackedDownloadState.IMPORTING:
        return 'Importing';
      case TrackedDownloadState.FAILED:
        return 'Failed';
      case TrackedDownloadState.FAILED_PENDING:
        return 'Failed pending';
      case TrackedDownloadState.IGNORED:
        return 'Ignored';
      case TrackedDownloadState.DOWNLOADING:
        return 'Downloading';
      default:
        return 'Unknown';
    }
  }
}
