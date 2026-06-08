export type GiphyImageData = {
  url: string;
  width: string;
  height: string;
  size: string;
  mp4?: string;
  mp4_size?: string;
  webp?: string;
  webp_size?: string;
};

export type GiphySearchResult = {
  id: string;
  type: string;
  url: string;
  slug: string;
  title: string;
  rating: string;
  images: {
    original: GiphyImageData;
    fixed_height: GiphyImageData;
    fixed_width: GiphyImageData;
  };
};
