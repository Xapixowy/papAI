import { CustomFormat } from './custom-format.type';
import { Language } from './language.type';
import { MediaInfo } from './media-info.type';
import { QualityModel } from './quality-model.type';

export type MovieFile = {
  id: number;
  movieId: number;
  relativePath: string | null;
  path: string | null;
  size: number;
  dateAdded: string;
  sceneName: string | null;
  releaseGroup: string | null;
  edition: string | null;
  languages: Language[] | null;
  quality: QualityModel;
  customFormats: CustomFormat[] | null;
  customFormatScore: number | null;
  indexerFlags: number | null;
  mediaInfo: MediaInfo;
  originalFilePath: string | null;
  qualityCutoffNotMet: boolean | null;
};
