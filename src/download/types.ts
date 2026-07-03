import type { SourceId } from "../sources/types";

export type DownloadStatus = "downloading" | "paused" | "completed" | "failed";

export type SeedStatus = "seeding" | "paused" | "missing";

export interface SeedItem {
  id: string;
  name: string;
  source?: SourceId;
  magnet: string;
  dir: string;
  sizeBytes: number;
  status: SeedStatus;
  uploadSpeed: number;
  uploaded: number;
  peers: number;
}

export interface CreatedItem {
  id: string;           // infoHash (empty until hashing completes)
  name: string;         // derived from file/folder basename
  sourcePath: string;   // local file/folder being seeded
  magnet: string;       // generated magnetURI (empty until ready)
  sizeBytes: number;
  status: SeedStatus;   // reuse "seeding" | "paused" | "missing"
  uploadSpeed: number;
  uploaded: number;
  peers: number;
  createdAt: number;
}

export interface QueueItem {
  id: string;
  name: string;
  source?: SourceId;
  magnet: string;
  dir: string;
  status: DownloadStatus;
  progress: number;
  totalBytes: number;
  downloadedBytes: number;
  speed: number;
  peers: number;
  eta?: number;
  files?: number;
  error?: string;
  addedAt: number;
}
