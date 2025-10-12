import { SourceType } from '@Enums/radarr/movie';

export type AlternateTitle = {
  id: number;
  sourceType: SourceType;
  movieMetadataId: number;
  title: string | null;
  cleanTitle: string | null;
};
