import { createContext, useContext, useEffect, useState } from "react";
import type { Config } from "../config/config";
import type { DownloadQueue } from "../download/queue";
import type { HistoryItem } from "../download/history";
import type { QueueItem, SeedItem, CreatedItem } from "../download/types";
import type { SourceGroup, SourceId } from "../sources/types";
import type { UpdateResult } from "../util/update-checker";

export type View = "splash" | "browser";

export type Category = "all" | "games" | "movies" | "tv" | "anime";

export type Section = Category | "downloads" | "seeding" | "create" | "settings";

export const CATEGORIES: { key: Category; label: string; group?: SourceGroup }[] = [
  { key: "all", label: "All" },
  { key: "games", label: "Games", group: "Games" },
  { key: "movies", label: "Movies", group: "Movies" },
  { key: "tv", label: "TV", group: "TV" },
  { key: "anime", label: "Anime", group: "Anime" },
];

export type Region = "sidebar" | "content" | "help";

export type CaptureMode = "none" | "text" | "esc";

export type DownloadFocus = "downloading" | "paused" | "failed" | "recent";

export type SeedFocus = "seeding" | "paused" | "missing" | "idle";

export type CreateFocus = "seeding" | "paused" | "missing" | null;

export interface AppConfigContext {
  config: Config;
  setConfig: (c: Config) => void;
}

export interface NavigationContextType {
  view: View;
  setView: (v: View) => void;
  query: string;
  submitQuery: (q: string) => void;
  section: Section;
  setSection: (s: Section) => void;
  region: Region;
  setRegion: (r: Region) => void;
}

export interface OverlayContextType {
  captureMode: CaptureMode;
  setCaptureMode: (m: CaptureMode) => void;
  notice: string | null;
  setNotice: (s: string | null) => void;
  updateInfo: UpdateResult | null;
  setUpdateInfo: (info: UpdateResult | null) => void;
}

export interface FocusContextType {
  downloadFocus: DownloadFocus | null;
  setDownloadFocus: (f: DownloadFocus | null) => void;
  seedFocus: SeedFocus | null;
  setSeedFocus: (f: SeedFocus | null) => void;
  createFocus: CreateFocus;
  setCreateFocus: (f: CreateFocus) => void;
}

export interface QueueContextType {
  queue: DownloadQueue;
  startDownload: (input: {
    id: string;
    name: string;
    magnet: string;
    source?: SourceId;
    sizeBytes?: number;
  }) => void;
  copyMagnet: (input: { name: string; magnet: string }) => void;
  quitAll: () => void;
}

export interface LayoutContextType {
  listRows: number;
  compact: boolean;
  contentWidth: number;
  cols: number;
  rows: number;
}

export const ConfigContext = createContext<AppConfigContext | null>(null); // Core state contexts
export const NavigationContext = createContext<NavigationContextType | null>(null);
export const OverlayContext = createContext<OverlayContextType | null>(null);
export const FocusContext = createContext<FocusContextType | null>(null);
export const QueueContext = createContext<QueueContextType | null>(null);
export const LayoutContext = createContext<LayoutContextType | null>(null);

export function useConfigContext(): AppConfigContext {
  const s = useContext(ConfigContext);
  if (!s) throw new Error("ConfigContext not available");
  return s;
}

export function useNavigationContext(): NavigationContextType {
  const s = useContext(NavigationContext);
  if (!s) throw new Error("NavigationContext not available");
  return s;
}

export function useOverlayContext(): OverlayContextType {
  const s = useContext(OverlayContext);
  if (!s) throw new Error("OverlayContext not available");
  return s;
}

export function useFocusContext(): FocusContextType {
  const s = useContext(FocusContext);
  if (!s) throw new Error("FocusContext not available");
  return s;
}

export function useQueueContext(): QueueContextType {
  const s = useContext(QueueContext);
  if (!s) throw new Error("QueueContext not available");
  return s;
}

export function useLayoutContext(): LayoutContextType {
  const s = useContext(LayoutContext);
  if (!s) throw new Error("LayoutContext not available");
  return s;
}

export function useQueueItems(queue: DownloadQueue): QueueItem[] {
  const [items, setItems] = useState<QueueItem[]>(() => queue.getItems());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onUpdate = (): void => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        setItems(queue.getItems());
      }, 200);
    };
    queue.on("update", onUpdate);
    onUpdate();
    return () => {
      queue.off("update", onUpdate);
      if (timer) clearTimeout(timer);
    };
  }, [queue]);
  return items;
}

export function useQueueHistory(queue: DownloadQueue): HistoryItem[] {
  const [items, setItems] = useState<HistoryItem[]>(() => queue.getHistory());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onUpdate = (): void => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        setItems(queue.getHistory());
      }, 200);
    };
    queue.on("update", onUpdate);
    onUpdate();
    return () => {
      queue.off("update", onUpdate);
      if (timer) clearTimeout(timer);
    };
  }, [queue]);
  return items;
}

export function useSeeds(queue: DownloadQueue): Map<string, SeedItem> {
  const [seeds, setSeeds] = useState<Map<string, SeedItem>>(
    () => new Map(queue.getSeeds().map((s) => [s.id, s])),
  );
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onUpdate = (): void => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        setSeeds(new Map(queue.getSeeds().map((s) => [s.id, s])));
      }, 200);
    };
    queue.on("update", onUpdate);
    onUpdate();
    return () => {
      queue.off("update", onUpdate);
      if (timer) clearTimeout(timer);
    };
  }, [queue]);
  return seeds;
}

export function useCreatedItems(queue: DownloadQueue): CreatedItem[] {
  const [items, setItems] = useState<CreatedItem[]>(() => queue.getCreated());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onUpdate = (): void => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        setItems(queue.getCreated());
      }, 200);
    };
    queue.on("update", onUpdate);
    onUpdate();
    return () => {
      queue.off("update", onUpdate);
      if (timer) clearTimeout(timer);
    };
  }, [queue]);
  return items;
}
