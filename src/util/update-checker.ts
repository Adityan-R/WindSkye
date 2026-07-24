import { promises as fs } from "node:fs";
import { updateCacheFile } from "../config/paths";
import { VERSION } from "../version";
import { serializeWrites, writeJsonAtomic } from "./atomic";
import { USER_AGENT } from "./net";

export const GITHUB_REPO = "baairon/windskye";
export const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const DEFAULT_TIMEOUT_MS = 3000; // 3 seconds

export interface UpdateCacheData {
  lastChecked: number;
  latestVersion: string | null;
  releaseUrl: string | null;
  ignoredVersion?: string | null;
}

export interface UpdateResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string | null;
  releaseUrl: string | null;
  checkedAt: number;
  fromCache: boolean;
  error?: string;
}

export interface CheckOptions {
  force?: boolean;
  enabled?: boolean;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  cacheTtlMs?: number;
}

export function parseSemver(v: string): [number, number, number] {
  const cleaned = v.trim().replace(/^v/i, "");
  const parts = cleaned.split(".").map((p) => {
    const num = parseInt(p, 10);
    return isNaN(num) ? 0 : num;
  });
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

export function compareSemver(v1: string, v2: string): number {
  const [maj1, min1, pat1] = parseSemver(v1);
  const [maj2, min2, pat2] = parseSemver(v2);

  if (maj1 !== maj2) return maj1 > maj2 ? 1 : -1;
  if (min1 !== min2) return min1 > min2 ? 1 : -1;
  if (pat1 !== pat2) return pat1 > pat2 ? 1 : -1;
  return 0;
}

const writeCache = serializeWrites();

export async function loadUpdateCache(): Promise<UpdateCacheData> {
  try {
    const raw = await fs.readFile(updateCacheFile, "utf8");
    const parsed = JSON.parse(raw) as Partial<UpdateCacheData>;
    return {
      lastChecked: typeof parsed.lastChecked === "number" ? parsed.lastChecked : 0,
      latestVersion: typeof parsed.latestVersion === "string" ? parsed.latestVersion : null,
      releaseUrl: typeof parsed.releaseUrl === "string" ? parsed.releaseUrl : null,
      ignoredVersion: typeof parsed.ignoredVersion === "string" ? parsed.ignoredVersion : null,
    };
  } catch {
    return {
      lastChecked: 0,
      latestVersion: null,
      releaseUrl: null,
      ignoredVersion: null,
    };
  }
}

export async function saveUpdateCache(data: UpdateCacheData): Promise<void> {
  await writeCache(() => writeJsonAtomic(updateCacheFile, data));
}

export async function getCachedUpdateInfo(): Promise<UpdateResult> {
  const cache = await loadUpdateCache();
  const hasUpdate = Boolean(
    cache.latestVersion && compareSemver(cache.latestVersion, VERSION) > 0
  );
  return {
    hasUpdate,
    currentVersion: VERSION,
    latestVersion: cache.latestVersion,
    releaseUrl: cache.releaseUrl,
    checkedAt: cache.lastChecked,
    fromCache: true,
  };
}

export async function checkForUpdates(options: CheckOptions = {}): Promise<UpdateResult> {
  const {
    force = false,
    enabled = true,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetchImpl = fetch,
    cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  } = options;

  if (!enabled) {
    return {
      hasUpdate: false,
      currentVersion: VERSION,
      latestVersion: null,
      releaseUrl: null,
      checkedAt: Date.now(),
      fromCache: false,
    };
  }

  const now = Date.now();
  const cache = await loadUpdateCache();

  if (!force && cache.lastChecked > 0 && now - cache.lastChecked < cacheTtlMs) {
    const hasUpdate = Boolean(
      cache.latestVersion && compareSemver(cache.latestVersion, VERSION) > 0
    );
    return {
      hasUpdate,
      currentVersion: VERSION,
      latestVersion: cache.latestVersion,
      releaseUrl: cache.releaseUrl,
      checkedAt: cache.lastChecked,
      fromCache: true,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
    const res = await fetchImpl(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/vnd.github.v3+json",
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`GitHub API HTTP ${res.status}`);
    }

    const data = (await res.json()) as { tag_name?: string; html_url?: string };
    if (!data || typeof data.tag_name !== "string") {
      throw new Error("Invalid release metadata format");
    }

    const latestVersion = data.tag_name.replace(/^v/i, "").trim();
    const releaseUrl = typeof data.html_url === "string" ? data.html_url : null;
    const hasUpdate = compareSemver(latestVersion, VERSION) > 0;

    const newCache: UpdateCacheData = {
      lastChecked: now,
      latestVersion,
      releaseUrl,
      ignoredVersion: cache.ignoredVersion ?? null,
    };

    await saveUpdateCache(newCache);

    return {
      hasUpdate,
      currentVersion: VERSION,
      latestVersion,
      releaseUrl,
      checkedAt: now,
      fromCache: false,
    };
  } catch (err: any) {
    clearTimeout(timer);
    // Silent fail gracefully, falling back to cached info if present
    const hasUpdate = Boolean(
      cache.latestVersion && compareSemver(cache.latestVersion, VERSION) > 0
    );
    return {
      hasUpdate,
      currentVersion: VERSION,
      latestVersion: cache.latestVersion,
      releaseUrl: cache.releaseUrl,
      checkedAt: cache.lastChecked || now,
      fromCache: false,
      error: err?.message ?? "Update check failed",
    };
  }
}
