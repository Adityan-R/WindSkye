import { EventEmitter } from "node:events";
import { TorrentEngine } from "./engine";
import { DownloadManager, type AddInput } from "./managers/download";
import { SeedManager } from "./managers/seed";
import { HistoryManager } from "./managers/history";
import { CreateManager } from "./managers/create";
import type { QueueItem, SeedItem, CreatedItem } from "./types";
import type { HistoryItem } from "./history";
import type { SeedRecord, CreatedRecord } from "./persist";
import { notify } from "../util/notify";

const POLL_MS = 500;

export type { AddInput };
export { strayDownload } from "./managers/seed";

export class DownloadQueue extends EventEmitter {
  private engine = new TorrentEngine();
  private poll: ReturnType<typeof setInterval> | null = null;
  private notificationsEnabled = true;
  
  private downloadManager: DownloadManager;
  private seedManager: SeedManager;
  private historyManager: HistoryManager;
  private createManager: CreateManager;

  constructor() {
    super();
    
    this.historyManager = new HistoryManager(() => this.changed());
    
    this.seedManager = new SeedManager({
      engine: this.engine,
      onChange: () => this.changed(),
      ensurePoll: () => this.ensurePoll(),
      maybeStopPoll: () => this.maybeStopPoll(),
      onMissing: (id, name) => {
        if (this.notificationsEnabled) notify("Torrent Error", `${name}: File missing`);
      }
    });

    this.downloadManager = new DownloadManager({
      engine: this.engine,
      onChange: () => this.changed(),
      ensurePoll: () => this.ensurePoll(),
      maybeStopPoll: () => this.maybeStopPoll(),
      onComplete: (it) => {
        this.historyManager.record(it);
        this.seedManager.adoptAsSeed(it);
        this.emit("completed", it.name);
        if (this.notificationsEnabled) notify("Download Completed", it.name);
      },
      onError: (id, name, msg) => {
        if (this.notificationsEnabled) notify("Download Failed", `${name}: ${msg}`);
      },
      onNewDownload: (name) => {
        if (this.notificationsEnabled) notify("Torrent Added", name);
      }
    });
    
    this.createManager = new CreateManager({
      engine: this.engine,
      onChange: () => this.changed(),
      ensurePoll: () => this.ensurePoll(),
      maybeStopPoll: () => this.maybeStopPoll(),
    });
  }

  applyConfig(config: { maxConns: number; downloadLimit: number; uploadLimit: number; notifications: boolean }): void {
    this.engine.setConfig(config.maxConns, config.downloadLimit, config.uploadLimit);
    this.notificationsEnabled = config.notifications;
  }

  private changed(): void {
    this.emit("update");
  }

  private ensurePoll(): void {
    if (this.poll) return;
    this.poll = setInterval(() => this.tick(), POLL_MS);
    this.poll.unref();
  }

  private maybeStopPoll(): void {
    if (this.activeCount === 0 && this.seedingCount === 0 && this.createdCount === 0 && this.poll) {
      clearInterval(this.poll);
      this.poll = null;
    }
  }

  private tick(): void {
    const d = this.downloadManager.tick();
    const s = this.seedManager.tick();
    const c = this.createManager.tick();
    if (d || s || c) this.changed();
  }

  // --- Facade: Downloads ---
  getItems(): QueueItem[] { return this.downloadManager.getAll(); }
  get activeCount(): number { return this.downloadManager.activeCount; }
  has(id: string): boolean { return this.downloadManager.has(id); }
  add(input: AddInput, dir: string): void {
    if (this.seedManager.has(input.id)) this.seedManager.remove(input.id);
    this.downloadManager.add(input, dir);
  }
  pause(id: string): void { this.downloadManager.pause(id); }
  resume(id: string): void { this.downloadManager.resume(id); }
  togglePause(id: string): void { this.downloadManager.togglePause(id); }
  cancel(id: string): void { this.downloadManager.cancel(id); }
  commitSelection(id: string, files: number[], seq: boolean): void { this.downloadManager.commitSelection(id, files, seq); }
  retry(id: string): void { this.downloadManager.retry(id); }
  retryFailed(): void { this.downloadManager.retryFailed(); }
  restore(items: QueueItem[]): void { this.downloadManager.restore(items); }

  // --- Facade: Seeds ---
  getSeed(id: string): SeedItem | undefined { return this.seedManager.get(id); }
  getSeeds(): SeedItem[] { return this.seedManager.getAll(); }
  get seedingCount(): number { return this.seedManager.activeCount; }
  startSeeding(h: HistoryItem): void {
    if (this.downloadManager.has(h.id)) return;
    this.seedManager.startSeeding(h);
  }
  stopSeeding(id: string): void { this.seedManager.stopSeeding(id); }
  toggleSeeding(h: HistoryItem): void { this.seedManager.toggleSeeding(h); }
  restoreSeeds(records: SeedRecord[]): void { 
    this.seedManager.restore(records, (id) => this.historyManager.getById(id)); 
  }

  // --- Facade: History ---
  restoreHistory(items: HistoryItem[]): void { this.historyManager.restore(items); }
  getHistory(): HistoryItem[] { return this.historyManager.get(); }
  removeHistory(id: string): void {
    if (this.historyManager.remove(id)) {
      this.seedManager.remove(id);
    }
  }
  clearHistory(): void {
    if (this.historyManager.clear()) {
      this.seedManager.clear();
    }
  }

  // --- Facade: Create ---
  createTorrent(filePath: string): string | null { return this.createManager.createTorrent(filePath); }
  getCreated(): CreatedItem[] { return this.createManager.getAll(); }
  get createdCount(): number { return this.createManager.activeCount; }
  toggleCreatedPause(id: string): void { this.createManager.togglePause(id); }
  removeCreated(id: string): void { this.createManager.remove(id); }
  restoreCreated(records: CreatedRecord[]): void { this.createManager.restore(records); }

  // --- Lifecycle ---
  persistSync(): void {
    this.downloadManager.persistSync();
    this.historyManager.persistSync();
    this.seedManager.persistSync();
    this.createManager.persistSync();
  }

  suspend(): void {
    this.downloadManager.suspend();
    this.createManager.suspend();
    this.persistSync();
    if (this.poll) {
      clearInterval(this.poll);
      this.poll = null;
    }
    this.engine.destroy();
  }
}
