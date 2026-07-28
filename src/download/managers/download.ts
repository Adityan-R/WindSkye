import { TorrentEngine } from "../engine";
import { saveQueue, saveQueueSync, saveTorrentMeta, torrentMetaExists, torrentMetaPath, deleteTorrentMeta } from "../persist";
import type { QueueItem } from "../types";
import type { SourceId } from "../../sources/types";

export interface AddInput {
  id: string;
  name: string;
  magnet: string;
  source?: SourceId;
  sizeBytes?: number;
}

export interface DownloadManagerDeps {
  engine: TorrentEngine;
  onChange: () => void;
  ensurePoll: () => void;
  maybeStopPoll: () => void;
  onComplete: (it: QueueItem) => void;
  onError: (id: string, name: string, msg: string) => void;
  onNewDownload: (name: string) => void;
}

export class DownloadManager {
  private items = new Map<string, QueueItem>();
  private activeIds = new Set<string>(); // O(1) polling optimization

  constructor(private deps: DownloadManagerDeps) {}

  get activeCount(): number {
    return this.activeIds.size;
  }

  get(id: string): QueueItem | undefined {
    return this.items.get(id);
  }

  getAll(): QueueItem[] {
    return [...this.items.values()].sort((a, b) => b.addedAt - a.addedAt);
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  private startEngine(item: QueueItem): void {
    const source = torrentMetaExists(item.id) ? torrentMetaPath(item.id) : item.magnet;
    this.deps.engine.add(item.id, source, item.dir, this.engineHandlers(item.id), {
      selectedFiles: item.selectedFiles,
      sequential: item.sequential,
    });
    this.activeIds.add(item.id);
  }

  add(input: AddInput, dir: string): boolean {
    const existing = this.items.get(input.id);
    if (existing && existing.status !== "failed") return false; // Skip if already processing
    
    const isNew = !existing;
    const item: QueueItem = existing
      ? { ...existing, status: "downloading", error: undefined, speed: 0 }
      : {
          id: input.id,
          name: input.name,
          source: input.source,
          magnet: input.magnet,
          dir,
          status: "downloading",
          progress: 0,
          totalBytes: input.sizeBytes ?? 0,
          downloadedBytes: 0,
          speed: 0,
          peers: 0,
          addedAt: Date.now(),
        };
    
    this.items.set(item.id, item);
    this.startEngine(item);
    this.deps.ensurePoll();
    this.deps.onChange();
    void this.persist();

    if (isNew) {
      this.deps.onNewDownload(item.name || "Unknown Torrent");
    }
    return true;
  }

  pause(id: string): void {
    const it = this.items.get(id);
    if (!it || it.status !== "downloading") return;
    it.status = "paused";
    it.speed = 0;
    it.peers = 0;
    it.eta = undefined;
    this.deps.engine.remove(id);
    this.activeIds.delete(id);
    this.deps.onChange();
    void this.persist();
    this.deps.maybeStopPoll();
  }

  resume(id: string): void {
    const it = this.items.get(id);
    if (!it || it.status !== "paused") return;
    it.status = "downloading";
    this.startEngine(it);
    this.deps.ensurePoll();
    this.deps.onChange();
    void this.persist();
  }

  togglePause(id: string): void {
    const it = this.items.get(id);
    if (!it) return;
    if (it.status === "downloading") this.pause(id);
    else if (it.status === "paused") this.resume(id);
  }

  cancel(id: string): void {
    if (!this.items.has(id)) return;
    this.deps.engine.remove(id);
    this.items.delete(id);
    this.activeIds.delete(id);
    deleteTorrentMeta(id);
    this.deps.onChange();
    void this.persist();
    this.deps.maybeStopPoll();
  }

  commitSelection(id: string, selectedFiles: number[], sequential: boolean): void {
    const it = this.items.get(id);
    if (!it || it.status !== "selecting_files") return;
    it.selectedFiles = selectedFiles;
    it.sequential = sequential;
    it.status = "downloading";
    this.deps.engine.remove(id);
    this.activeIds.delete(id);
    this.startEngine(it);
    this.deps.ensurePoll();
    this.deps.onChange();
    void this.persist();
  }

  retry(id: string): void {
    const it = this.items.get(id);
    if (!it || it.status !== "failed") return;
    it.status = "downloading";
    it.error = undefined;
    this.startEngine(it);
    this.deps.ensurePoll();
    this.deps.onChange();
    void this.persist();
  }

  retryFailed(): void {
    for (const it of [...this.items.values()]) {
      if (it.status === "failed") this.retry(it.id);
    }
  }

  restore(items: QueueItem[]): void {
    for (const raw of items) {
      this.items.set(raw.id, raw);
      if (raw.status === "downloading") this.startEngine(raw);
    }
    if (this.activeIds.size > 0) this.deps.ensurePoll();
    this.deps.onChange();
  }

  tick(): boolean {
    let any = false;
    for (const id of this.activeIds) {
      const it = this.items.get(id);
      if (!it || it.status !== "downloading") continue;
      
      const s = this.deps.engine.stats(it.id);
      if (!s) continue;
      
      it.progress = Math.min(100, Math.round(s.progress * 100));
      it.downloadedBytes = s.downloaded;
      if (s.total) it.totalBytes = s.total;
      it.speed = s.speed;
      it.peers = s.peers;
      it.eta =
        s.timeRemaining > 0 && Number.isFinite(s.timeRemaining)
          ? s.timeRemaining / 1000
          : undefined;
      if (s.name) it.name = s.name;
      any = true;
    }
    return any;
  }

  engineHandlers(id: string) {
    return {
      onMetadata: (meta: any) => {
        if (meta.torrentFile) void saveTorrentMeta(id, meta.torrentFile);
        const it = this.items.get(id);
        if (!it) return;
        if (meta.name) it.name = meta.name;
        if (meta.total) it.totalBytes = meta.total;
        it.files = meta.files.length;
        it.fileList = meta.files;

        if (!it.selectedFiles) {
          it.status = "selecting_files";
        }
        this.deps.onChange();
        void this.persist();
      },
      onDone: () => {
        const it = this.items.get(id);
        if (it) {
          if (it.totalBytes) it.downloadedBytes = it.totalBytes;
          this.activeIds.delete(id);
          this.items.delete(id);
          this.deps.onComplete(it);
          this.deps.onChange();
          void this.persist();
          this.deps.maybeStopPoll();
        }
      },
      onError: (msg: string) => {
        const it = this.items.get(id);
        if (it) {
          it.status = "failed";
          it.error = msg;
          it.speed = 0;
          it.peers = 0;
          this.activeIds.delete(id);
          this.deps.onChange();
          void this.persist();
          this.deps.maybeStopPoll();
          this.deps.onError(it.id, it.name, msg);
        }
      },
    };
  }

  suspend(): void {
    for (const it of this.items.values()) {
      if (it.status === "downloading") {
        it.speed = 0;
        it.peers = 0;
        it.eta = undefined;
      }
    }
  }

  private persist(): Promise<void> {
    return saveQueue(this.getAll()).catch(() => {});
  }

  persistSync(): void {
    saveQueueSync(this.getAll());
  }
}
