export type MediaInfo = {
  id: number;
  audioBitrate: number;
  audioChannels: number;
  audioCodec: string | null;
  audioLanguages: string | null;
  audioStreamCount: number;
  videoBitDepth: number;
  videoBitrate: number;
  videoCodec: string | null;
  videoFps: number;
  videoDynamicRange: string | null;
  videoDynamicRangeType: string | null;
  resolution: string | null;
  runTime: string | null;
  scanType: string | null;
  subtitles: string | null;
};
