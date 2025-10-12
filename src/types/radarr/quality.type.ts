import { Modifier, QualitySource } from '@Enums/radarr/movie';

export type Quality = {
  id: number;
  name: string | null;
  source: QualitySource;
  resolution: number;
  modifier: Modifier;
};
