import { SetMetadata } from '@nestjs/common';

export const SILENT_REJECTION = 'silentRejection';

export const SilentRejection = () => SetMetadata(SILENT_REJECTION, true);
