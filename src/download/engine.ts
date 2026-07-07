import WebTorrent, { type Torrent } from "webtorrent";

export interface TorrentProgress {
  progress: number;
  downloaded: number;
  total: number;
  speed: number;
  uploadSpeed: number;
  uploaded: number;
  peers: number;
  timeRemaining: number;
  name: string;
}

export interface TorrentMeta {
  name: string;
  total: number;
  files: number;
  // The .torrent metadata (piece hashes), available once metadata arrives. We
  // persist it so a later re-seed can verify the on-disk file without having to
  // re-fetch metadata from the swarm (which a bare magnet would require).
  torrentFile?: Uint8Array;
}

export interface AddHandlers {
  onMetadata?: (meta: TorrentMeta) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
}

export interface SeedResult {
  infoHash: string;
  magnetURI: string;
  name: string;
  length: number;
  torrentFile?: Uint8Array;
}

export interface SeedHandlers {
  onSeed?: (result: SeedResult) => void;
  onError?: (message: string) => void;
}

// Well-known public trackers for user-created torrents.
export const DEFAULT_TRACKERS: string[] = [
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://open.stealth.si:80/announce",
  "udp://tracker.openbittorrent.com:6969/announce",
  "udp://exodus.desync.com:6969/announce",
  "udp://tracker.torrent.eu.org:451/announce",
];

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export class TorrentEngine {
  private client: WebTorrent | null = null;
  private torrents = new Map<string, Torrent>();
  private maxConns: number = 55;
  private downloadLimit: number = 0;
  private uploadLimit: number = 0;

  setConfig(maxConns: number, downloadLimit: number, uploadLimit: number): void {
    this.maxConns = maxConns;
    this.downloadLimit = downloadLimit;
    this.uploadLimit = uploadLimit;
    // We cannot easily recreate the client mid-download without dropping connections,
    // so config changes to the engine will take effect on next restart.
  }

  private ensureClient(): WebTorrent {
    if (!this.client) {
      this.client = new WebTorrent({
        maxConns: this.maxConns,
        downloadLimit: this.downloadLimit || undefined,
        uploadLimit: this.uploadLimit || undefined,
      } as any);
      this.client.on("error", () => {});
    }
    return this.client;
  }

  // `source` is a magnet URI, an infoHash, or a path to a .torrent file. Seeding
  // an existing file passes the stored .torrent path so webtorrent can verify it
  // locally instead of re-fetching metadata from the swarm.
  add(id: string, source: string, dir: string, handlers: AddHandlers): void {
    const client = this.ensureClient();
    const existing = this.torrents.get(id);
    if (existing) {
      this.torrents.delete(id);
      try {
        existing.destroy();
      } catch {}
    }

    let torrent: Torrent;
    try {
      torrent = client.add(source, { path: dir });
    } catch (e) {
      handlers.onError?.(message(e));
      return;
    }
    this.torrents.set(id, torrent);

    torrent.on("metadata", () => {
      handlers.onMetadata?.({
        name: torrent.name,
        total: torrent.length,
        files: torrent.files?.length ?? 0,
        torrentFile: torrent.torrentFile,
      });
    });
    torrent.on("done", () => {
      // A finished torrent is a complete, verified torrent: keep it alive so it
      // can seed. The queue owns its lifetime from here (remove/destroy).
      handlers.onDone?.();
    });
    torrent.on("error", (err: unknown) => {
      handlers.onError?.(message(err));
      this.torrents.delete(id);
      try {
        torrent.destroy();
      } catch {}
    });
  }

  // Seed a local file or folder. The returned Torrent object fires the 'seed'
  // event once hashing is complete, at which point infoHash and magnetURI are
  // available. We use a temporary placeholder ID until then.
  seed(placeholderId: string, filePath: string, handlers: SeedHandlers): void {
    const client = this.ensureClient();

    let torrent: Torrent;
    try {
      torrent = client.seed(filePath, {
        announce: DEFAULT_TRACKERS,
        createdBy: "Windskye",
      });
    } catch (e) {
      handlers.onError?.(message(e));
      return;
    }
    this.torrents.set(placeholderId, torrent);

    torrent.on("seed", () => {
      // Remap from placeholder to real infoHash now that we know it.
      this.torrents.delete(placeholderId);
      this.torrents.set(torrent.infoHash, torrent);
      handlers.onSeed?.({
        infoHash: torrent.infoHash,
        magnetURI: torrent.magnetURI,
        name: torrent.name,
        length: torrent.length,
        torrentFile: torrent.torrentFile,
      });
    });
    torrent.on("error", (err: unknown) => {
      handlers.onError?.(message(err));
      this.torrents.delete(placeholderId);
      try {
        torrent.destroy();
      } catch {}
    });
  }

  // The TCP port the client accepts incoming peers on (diagnostics / tests).
  listenPort(): number | null {
    return this.client?.torrentPort ?? null;
  }

  stats(id: string): TorrentProgress | null {
    const t = this.torrents.get(id);
    if (!t) return null;
    return {
      progress: t.progress,
      downloaded: t.downloaded,
      total: t.length,
      speed: t.downloadSpeed,
      uploadSpeed: t.uploadSpeed,
      uploaded: t.uploaded,
      peers: t.numPeers,
      timeRemaining: t.timeRemaining,
      name: t.name,
    };
  }

  remove(id: string): void {
    const t = this.torrents.get(id);
    this.torrents.delete(id);
    if (t) {
      try {
        t.destroy();
      } catch {}
    }
  }

  destroy(): void {
    this.torrents.clear();
    // Never block shutdown on webtorrent's async teardown: hand off the client
    // destroy to a later tick and let the OS reclaim sockets if we exit first.
    const client = this.client;
    this.client = null;
    if (client) {
      setImmediate(() => {
        try {
          client.destroy();
        } catch {}
      });
    }
  }
}
