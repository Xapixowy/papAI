import { AddMovieMethod, MonitorType } from '@Enums/radarr/movie';

export type AddMovieOptions = {
  ignoreEpisodesWithFiles: boolean;
  ignoreEpisodesWithoutFiles: boolean;
  monitor: MonitorType;
  searchForMovie: boolean;
  addMethod: AddMovieMethod;
};
