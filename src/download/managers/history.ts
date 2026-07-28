import { saveHistory, saveHistorySync, type HistoryItem } from "../history";
import { deleteTorrentMeta } from "../persist";

const HISTORY_MAX = 500;

export class HistoryManager {
  private items: HistoryItem[] = [];

  constructor(private onChange: () => void) {}

  restore(items: HistoryItem[]): void {
    this.items = items.slice(0, HISTORY_MAX);
  }

  get(): HistoryItem[] {
    return this.items;
  }

  getById(id: string): HistoryItem | undefined {
    return this.items.find(h => h.id === id);
  }

  record(it: { id: string; name: string; source?: any; totalBytes: number; magnet: string; dir: string }): void {
    const rec: HistoryItem = {
      id: it.id,
      name: it.name,
      source: it.source,
      sizeBytes: it.totalBytes,
      magnet: it.magnet,
      dir: it.dir,
      completedAt: Date.now(),
    };
    this.items = [rec, ...this.items.filter((h) => h.id !== it.id)].slice(0, HISTORY_MAX);
    void saveHistory(this.items).catch(() => {});
  }

  remove(id: string): boolean {
    const next = this.items.filter((h) => h.id !== id);
    if (next.length === this.items.length) return false;
    this.items = next;
    deleteTorrentMeta(id);
    void saveHistory(this.items).catch(() => {});
    this.onChange();
    return true;
  }

  clear(): boolean {
    if (this.items.length === 0) return false;
    for (const h of this.items) deleteTorrentMeta(h.id);
    this.items = [];
    void saveHistory(this.items).catch(() => {});
    this.onChange();
    return true;
  }

  persistSync(): void {
    saveHistorySync(this.items);
  }
}
