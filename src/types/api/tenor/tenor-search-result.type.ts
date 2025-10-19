import { TenorMediaFormat } from './tenor-media-format.type';

export type TenorSearchResult = {
  id: string;
  title: string;
  media_formats: Record<string, TenorMediaFormat>;
  created: number;
  content_description: string;
  itemurl: string;
  url: string;
  tags: string[];
  flags: string[];
  hasaudio: boolean;
  content_description_source: string;
};
