import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  compareSemver,
  parseSemver,
  loadUpdateCache,
  saveUpdateCache,
  checkForUpdates,
  getCachedUpdateInfo,
  UpdateCacheData,
} from "./update-checker";
import { VERSION } from "../version";

// Use temp state dir for isolation during tests
const tmpDir = path.join(os.tmpdir(), `windskye-update-test-${Math.random().toString(36).slice(2)}`);
process.env.WINDSKYE_STATE_DIR = tmpDir;

describe("update-checker", () => {
  beforeEach(async () => {
    const { updateCacheFile } = await import("../config/paths");
    try {
      await fs.rm(updateCacheFile, { force: true });
    } catch {}
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {}
    vi.restoreAllMocks();
  });

  describe("semver comparison", () => {
    it("parses version strings correctly", () => {
      expect(parseSemver("1.2.3")).toEqual([1, 2, 3]);
      expect(parseSemver("v2.0.1")).toEqual([2, 0, 1]);
      expect(parseSemver("V10.4.0")).toEqual([10, 4, 0]);
      expect(parseSemver("invalid")).toEqual([0, 0, 0]);
    });

    it("compares versions accurately", () => {
      expect(compareSemver("1.0.0", "1.0.0")).toBe(0);
      expect(compareSemver("v1.0.1", "1.0.0")).toBe(1);
      expect(compareSemver("1.0.0", "v1.0.1")).toBe(-1);
      expect(compareSemver("2.0.0", "1.99.99")).toBe(1);
      expect(compareSemver("1.2.0", "1.1.9")).toBe(1);
      expect(compareSemver("1.2.3", "1.2.4")).toBe(-1);
    });
  });

  describe("cache management", () => {
    it("handles missing cache file gracefully", async () => {
      const cache = await loadUpdateCache();
      expect(cache.lastChecked).toBe(0);
      expect(cache.latestVersion).toBeNull();
      expect(cache.releaseUrl).toBeNull();
    });

    it("saves and loads cache correctly", async () => {
      const sampleData: UpdateCacheData = {
        lastChecked: Date.now(),
        latestVersion: "2.0.0",
        releaseUrl: "https://github.com/baairon/windskye/releases/tag/v2.0.0",
      };
      await saveUpdateCache(sampleData);
      const loaded = await loadUpdateCache();
      expect(loaded.lastChecked).toBe(sampleData.lastChecked);
      expect(loaded.latestVersion).toBe("2.0.0");
      expect(loaded.releaseUrl).toBe(sampleData.releaseUrl);
    });

    it("handles corrupted cache file gracefully", async () => {
      const { updateCacheFile } = await import("../config/paths");
      await fs.mkdir(path.dirname(updateCacheFile), { recursive: true });
      await fs.writeFile(updateCacheFile, "{ invalid json ...", "utf8");

      const loaded = await loadUpdateCache();
      expect(loaded.lastChecked).toBe(0);
      expect(loaded.latestVersion).toBeNull();
    });
  });

  describe("checkForUpdates behavior", () => {
    it("returns hasUpdate false when update checking is disabled", async () => {
      const res = await checkForUpdates({ enabled: false });
      expect(res.hasUpdate).toBe(false);
      expect(res.fromCache).toBe(false);
    });

    it("uses cached response if cache TTL is valid and force is false", async () => {
      const mockCache: UpdateCacheData = {
        lastChecked: Date.now() - 1000, // 1 second ago
        latestVersion: "99.0.0",
        releaseUrl: "https://github.com/baairon/windskye/releases/tag/v99.0.0",
      };
      await saveUpdateCache(mockCache);

      const mockFetch = vi.fn();
      const res = await checkForUpdates({ force: false, fetchImpl: mockFetch as any });
      
      expect(res.fromCache).toBe(true);
      expect(res.hasUpdate).toBe(true);
      expect(res.latestVersion).toBe("99.0.0");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("bypasses cache when force is true", async () => {
      const mockCache: UpdateCacheData = {
        lastChecked: Date.now() - 1000,
        latestVersion: "99.0.0",
        releaseUrl: "https://github.com/baairon/windskye/releases/tag/v99.0.0",
      };
      await saveUpdateCache(mockCache);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ tag_name: "v100.0.0", html_url: "https://example.com/v100" }),
      });

      const res = await checkForUpdates({ force: true, fetchImpl: mockFetch as any });
      expect(res.fromCache).toBe(false);
      expect(res.hasUpdate).toBe(true);
      expect(res.latestVersion).toBe("100.0.0");
      expect(mockFetch).toHaveBeenCalled();
    });

    it("detects successful update when latest > VERSION", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ tag_name: "v999.0.0", html_url: "https://github.com/baairon/windskye/releases/v999" }),
      });

      const res = await checkForUpdates({ force: true, fetchImpl: mockFetch as any });
      expect(res.hasUpdate).toBe(true);
      expect(res.latestVersion).toBe("999.0.0");
      expect(res.currentVersion).toBe(VERSION);
      expect(res.fromCache).toBe(false);
    });

    it("detects up-to-date status when latest <= VERSION", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ tag_name: `v${VERSION}`, html_url: "https://github.com/baairon/windskye" }),
      });

      const res = await checkForUpdates({ force: true, fetchImpl: mockFetch as any });
      expect(res.hasUpdate).toBe(false);
      expect(res.latestVersion).toBe(VERSION);
    });

    it("handles network failure and offline mode gracefully without throwing", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Failed to fetch"));

      const res = await checkForUpdates({ force: true, fetchImpl: mockFetch as any });
      expect(res.hasUpdate).toBe(false);
      expect(res.error).toBe("Failed to fetch");
    });

    it("handles GitHub API HTTP non-200 responses gracefully", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      });

      const res = await checkForUpdates({ force: true, fetchImpl: mockFetch as any });
      expect(res.hasUpdate).toBe(false);
      expect(res.error).toContain("HTTP 403");
    });

    it("getCachedUpdateInfo returns cached update status", async () => {
      await saveUpdateCache({
        lastChecked: Date.now(),
        latestVersion: "5.0.0",
        releaseUrl: "https://example.com/rel",
      });

      const info = await getCachedUpdateInfo();
      expect(info.fromCache).toBe(true);
      expect(info.hasUpdate).toBe(true);
      expect(info.latestVersion).toBe("5.0.0");
    });
  });
});
