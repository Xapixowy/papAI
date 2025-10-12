import { RatingType } from '@Enums/radarr/movie';

export type Rating = {
  votes: number;
  value: number;
  type: RatingType;
};
