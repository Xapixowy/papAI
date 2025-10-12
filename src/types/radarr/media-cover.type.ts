import { MediaCoverType } from '@Enums/radarr/movie';

export type MediaCover = {
  coverType: MediaCoverType;
  url: string | null;
  remoteUrl: string | null;
};
