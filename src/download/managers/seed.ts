import { TorrentEngine } from "../engine";
import { saveSeeds, saveSeedsSync, type SeedRecord, torrentMetaExists, torrentMetaPath } from "../persist";
import type { SeedItem } from "../types";
import type { HistoryItem } from "../history";

export function strayDownload(s: { total: number; progress: number; speed: number }): boolean {
  return s.total > 0 && s.progress < 1 && s.speed > 0;
}

const STRAY_TICKS = 2;
const SEED_GRACE_MS = 10_000;

export interface SeedManagerDeps {
  engine: TorrentEngine;
  onChange: () => void;
  ensurePoll: () => void;
  maybeStopPoll: () => void;
  onMissing: (id: string, name: string) => void;
}

export class SeedManager {
  private seeds = new Map<string, SeedItem>();
  private activeIds = new Set<string>(); // O(1) polling optimization
  private strayHits = new Map<string, number>();
  private seedStartedAt = new Map<string, number>();

  constructor(private deps: SeedManagerDeps) {}

  get activeCount(): number {
    return this.activeIds.size;
  }

  get(id: string): SeedItem | undefined {
    return this.seeds.get(id);
  }

  getAll(): SeedItem[] {
    return [...this.seeds.values()];
  }

  has(id: string): boolean {
    return this.seeds.has(id);
  }

  startSeeding(h: HistoryItem): void {
    if (this.seeds.get(h.id)?.status === "seeding") return;

    const base: SeedItem = {
      id: h.id,
      name: h.name,
      source: h.source,
      magnet: h.magnet,
      dir: h.dir,
      sizeBytes: h.sizeBytes,
      status: "seeding",
      uploadSpeed: 0,
      uploaded: 0,
      peers: 0,
    };

    if (!h.magnet) {
      this.seeds.set(h.id, { ...base, status: "missing" });
      this.deps.onChange();
      void this.persist();
      return;
    }

    this.seeds.set(h.id, base);
    this.activeIds.add(h.id);
    this.strayHits.set(h.id, 0);
    this.seedStartedAt.set(h.id, Date.now());
    
    const source = torrentMetaExists(h.id) ? torrentMetaPath(h.id) : h.magnet;
    this.deps.engine.add(h.id, source, h.dir, this.engineHandlers(h.id));
    this.deps.ensurePoll();
    this.deps.onChange();
    void this.persist();
  }

  stopSeeding(id: string): void {
    const s = this.seeds.get(id);
    if (!s) return;
    this.deps.engine.remove(id);
    this.strayHits.delete(id);
    this.seedStartedAt.delete(id);
    this.activeIds.delete(id);
    
    if (s.status === "seeding") {
      s.status = "paused";
      s.uploadSpeed = 0;
      s.peers = 0;
    }
    this.deps.onChange();
    void this.persist();
    this.deps.maybeStopPoll();
  }

  toggleSeeding(h: HistoryItem): void {
    if (this.seeds.get(h.id)?.status === "seeding") this.stopSeeding(h.id);
    else this.startSeeding(h);
  }
  
  remove(id: string): void {
    if (!this.seeds.has(id)) return;
    this.deps.engine.remove(id);
    this.seeds.delete(id);
    this.strayHits.delete(id);
    this.seedStartedAt.delete(id);
    this.activeIds.delete(id);
    void this.persist();
    this.deps.maybeStopPoll();
  }
  
  clear(): void {
    for (const id of this.seeds.keys()) {
      this.deps.engine.remove(id);
    }
    this.seeds.clear();
    this.strayHits.clear();
    this.seedStartedAt.clear();
    this.activeIds.clear();
    void this.persist();
    this.deps.maybeStopPoll();
  }

  restore(records: SeedRecord[], getHistoryItem: (id: string) => HistoryItem | undefined): void {
    for (const r of records) {
      const h = getHistoryItem(r.id);
      if (!h) continue;
      if (r.status === "seeding") this.startSeeding(h);
      else this.restorePaused(h);
    }
  }

  private restorePaused(h: HistoryItem): void {
    if (this.seeds.has(h.id)) return;
    this.seeds.set(h.id, {
      id: h.id,
      name: h.name,
      source: h.source,
      magnet: h.magnet,
      dir: h.dir,
      sizeBytes: h.sizeBytes,
      status: "paused",
      uploadSpeed: 0,
      uploaded: 0,
      peers: 0,
    });
    this.deps.onChange();
  }

  tick(): boolean {
    let any = false;
    const now = Date.now();
    for (const id of this.activeIds) {
      const sd = this.seeds.get(id);
      if (!sd || sd.status !== "seeding") continue;
      
      const s = this.deps.engine.stats(id);
      if (!s) continue;
      
      const age = now - (this.seedStartedAt.get(id) ?? 0);
      if (age > SEED_GRACE_MS && strayDownload(s)) {
        const hits = (this.strayHits.get(id) ?? 0) + 1;
        this.strayHits.set(id, hits);
        if (hits >= STRAY_TICKS) {
          this.deps.engine.remove(id);
          this.strayHits.delete(id);
          this.seedStartedAt.delete(id);
          this.activeIds.delete(id);
          sd.status = "missing";
          sd.uploadSpeed = 0;
          sd.peers = 0;
          void this.persist();
          this.deps.onMissing(id, sd.name);
        }
        any = true;
        continue;
      }
      this.strayHits.set(id, 0);
      sd.uploadSpeed = s.uploadSpeed;
      sd.uploaded = s.uploaded;
      sd.peers = s.peers;
      any = true;
    }
    return any;
  }

  // The engine handlers are used when downloading finishes and it automatically becomes a seed,
  // or when a seed starts and passes verification.
  engineHandlers(id: string) {
    return {
      onDone: () => {
        // A re-seed passed verification
        if (this.seeds.has(id)) {
          this.strayHits.set(id, 0);
          this.seedStartedAt.delete(id);
        }
      },
      onError: (msg: string) => {
        const sd = this.seeds.get(id);
        if (sd) {
          sd.status = "missing";
          sd.uploadSpeed = 0;
          sd.peers = 0;
          this.seedStartedAt.delete(id);
          this.activeIds.delete(id);
          this.deps.onChange();
          void this.persist();
          this.deps.maybeStopPoll();
          this.deps.onMissing(id, `${sd.name}: ${msg}`);
        }
      }
    };
  }

  // Adopt a newly finished download directly as a seed
  adoptAsSeed(it: { id: string, name: string, source?: any, magnet: string, dir: string, totalBytes: number }): void {
    if (!it.magnet) return;
    this.seeds.set(it.id, {
      id: it.id,
      name: it.name,
      source: it.source,
      magnet: it.magnet,
      dir: it.dir,
      sizeBytes: it.totalBytes,
      status: "seeding",
      uploadSpeed: 0,
      uploaded: 0,
      peers: 0,
    });
    this.activeIds.add(it.id);
    this.strayHits.set(it.id, 0);
    this.seedStartedAt.set(it.id, Date.now());
    this.deps.ensurePoll();
    void this.persist();
  }

  private records(): SeedRecord[] {
    const out: SeedRecord[] = [];
    for (const s of this.seeds.values()) {
      if (s.status === "seeding") out.push({ id: s.id, status: "seeding" });
      else out.push({ id: s.id, status: "paused" });
    }
    return out;
  }

  private persist(): Promise<void> {
    return saveSeeds(this.records()).catch(() => {});
  }

  persistSync(): void {
    saveSeedsSync(this.records());
  }
}
