export type KlipyMediaFormat = {
  url: string;
  width: number;
  height: number;
  size: number;
};

export type KlipyFileVariant = {
  gif?: KlipyMediaFormat;
  webp?: KlipyMediaFormat;
  jpg?: KlipyMediaFormat;
  mp4?: KlipyMediaFormat;
  webm?: KlipyMediaFormat;
};

export type KlipySearchResult = {
  id: number;
  slug: string;
  title: string;
  type: string;
  tags: string[];
  blur_preview: string;
  file: {
    hd: KlipyFileVariant;
    md: KlipyFileVariant;
    sm: KlipyFileVariant;
    xs: KlipyFileVariant;
  };
};
