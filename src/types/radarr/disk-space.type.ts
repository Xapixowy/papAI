export type DiskSpace = {
  id: number;
  path: string | null;
  label: string | null;
  freeSpace: number;
  totalSpace: number;
};
