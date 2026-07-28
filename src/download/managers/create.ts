import { existsSync } from "node:fs";
import path from "node:path";
import { TorrentEngine } from "../engine";
import { saveCreated, saveCreatedSync, type CreatedRecord, saveTorrentMeta, torrentMetaExists, torrentMetaPath } from "../persist";
import type { CreatedItem } from "../types";

export interface CreateManagerDeps {
  engine: TorrentEngine;
  onChange: () => void;
  ensurePoll: () => void;
  maybeStopPoll: () => void;
}

export class CreateManager {
  private created = new Map<string, CreatedItem>();
  private activeIds = new Set<string>(); // O(1) polling
  private nextPlaceholder = 0;

  constructor(private deps: CreateManagerDeps) {}

  get activeCount(): number {
    return this.activeIds.size;
  }

  getAll(): CreatedItem[] {
    return [...this.created.values()].sort((a, b) => b.createdAt - a.createdAt);
  }

  createTorrent(filePath: string): string | null {
    if (!existsSync(filePath)) return null;

    const name = path.basename(filePath);
    const placeholder = `__create_${this.nextPlaceholder++}_${Date.now()}`;

    const item: CreatedItem = {
      id: placeholder,
      name,
      sourcePath: filePath,
      magnet: "",
      sizeBytes: 0,
      status: "seeding",
      uploadSpeed: 0,
      uploaded: 0,
      peers: 0,
      createdAt: Date.now(),
    };
    this.created.set(placeholder, item);
    this.activeIds.add(placeholder);
    this.deps.onChange();

    this.deps.engine.seed(placeholder, filePath, {
      onSeed: (result) => {
        this.created.delete(placeholder);
        this.activeIds.delete(placeholder);
        
        item.id = result.infoHash;
        item.magnet = result.magnetURI;
        item.name = result.name || name;
        item.sizeBytes = result.length;
        
        this.created.set(item.id, item);
        this.activeIds.add(item.id);
        
        if (result.torrentFile) void saveTorrentMeta(item.id, result.torrentFile);
        this.deps.onChange();
        void this.persist();
      },
      onError: () => {
        const c = this.created.get(placeholder);
        if (c) {
          c.status = "missing";
          this.activeIds.delete(placeholder);
          this.deps.onChange();
          void this.persist();
        }
      },
    });

    this.deps.ensurePoll();
    return placeholder;
  }

  togglePause(id: string): void {
    const c = this.created.get(id);
    if (!c) return;
    if (c.status === "seeding") {
      c.status = "paused";
      c.uploadSpeed = 0;
      c.peers = 0;
      this.deps.engine.remove(id);
      this.activeIds.delete(id);
      this.deps.maybeStopPoll();
    } else if (c.status === "paused" || c.status === "missing") {
      if (c.status === "missing" && !existsSync(c.sourcePath)) return;
      c.status = "seeding";
      this.activeIds.add(id);
      this.deps.engine.seed(id, c.sourcePath, {
        onSeed: (result) => {
          if (result.infoHash !== id) {
            this.created.delete(id);
            this.activeIds.delete(id);
            c.id = result.infoHash;
            this.created.set(c.id, c);
            this.activeIds.add(c.id);
          }
          c.magnet = result.magnetURI;
          c.sizeBytes = result.length;
          this.deps.onChange();
          void this.persist();
        },
        onError: () => {
          c.status = "missing";
          this.activeIds.delete(id); // no longer actively seeding
          this.deps.onChange();
          void this.persist();
        },
      });
      this.deps.ensurePoll();
    }
    this.deps.onChange();
    void this.persist();
  }

  remove(id: string): void {
    if (!this.created.has(id)) return;
    this.deps.engine.remove(id);
    this.created.delete(id);
    this.activeIds.delete(id);
    this.deps.onChange();
    void this.persist();
    this.deps.maybeStopPoll();
  }

  restore(records: CreatedRecord[]): void {
    for (const r of records) {
      const item: CreatedItem = {
        id: r.id,
        name: r.name,
        sourcePath: r.sourcePath,
        magnet: r.magnet,
        sizeBytes: r.sizeBytes,
        status: r.status === "seeding" ? "seeding" : "paused",
        uploadSpeed: 0,
        uploaded: 0,
        peers: 0,
        createdAt: r.createdAt,
      };
      this.created.set(r.id, item);
      if (r.status === "seeding") {
        this.activeIds.add(r.id);
        const source = torrentMetaExists(r.id) ? torrentMetaPath(r.id) : r.sourcePath;
        this.deps.engine.seed(r.id, source, {
          onSeed: (result) => {
            if (result.infoHash !== r.id) {
              this.created.delete(r.id);
              this.activeIds.delete(r.id);
              item.id = result.infoHash;
              this.created.set(item.id, item);
              this.activeIds.add(item.id);
            }
            item.magnet = result.magnetURI;
            item.sizeBytes = result.length;
            this.deps.onChange();
            void this.persist();
          },
          onError: () => {
            item.status = "missing";
            this.activeIds.delete(r.id);
            this.deps.onChange();
            void this.persist();
          },
        });
        this.deps.ensurePoll();
      }
    }
    this.deps.onChange();
  }

  tick(): boolean {
    let any = false;
    for (const id of this.activeIds) {
      const c = this.created.get(id);
      if (!c || c.status !== "seeding") continue;
      const s = this.deps.engine.stats(id);
      if (!s) continue;
      c.uploadSpeed = s.uploadSpeed;
      c.uploaded = s.uploaded;
      c.peers = s.peers;
      any = true;
    }
    return any;
  }

  suspend(): void {
    for (const id of this.activeIds) {
      const c = this.created.get(id);
      if (c && c.status === "seeding") {
        c.uploadSpeed = 0;
        c.peers = 0;
      }
    }
  }

  private records(): CreatedRecord[] {
    const out: CreatedRecord[] = [];
    for (const c of this.created.values()) {
      if (c.id.startsWith("__create_")) continue;
      out.push({
        id: c.id,
        name: c.name,
        sourcePath: c.sourcePath,
        magnet: c.magnet,
        sizeBytes: c.sizeBytes,
        status: c.status,
        createdAt: c.createdAt,
      });
    }
    return out;
  }

  private persist(): Promise<void> {
    return saveCreated(this.records()).catch(() => {});
  }

  persistSync(): void {
    saveCreatedSync(this.records());
  }
}
