import { promises as fs } from "node:fs";
import { configFile, defaultDownloadDir } from "./paths";
import { serializeWrites, writeJsonAtomic } from "../util/atomic";

export interface Config {
  downloadDir: string;
  theme: "default" | "hacker" | "vibrant";
  maxConns: number;
  downloadLimit: number;
  uploadLimit: number;
  notifications: boolean;
  enableBlinker: boolean;
  blinkerGradient: "original" | "dark" | "light";
}

export const defaultConfig: Config = {
  downloadDir: defaultDownloadDir,
  theme: "default",
  maxConns: 55,
  downloadLimit: 0,
  uploadLimit: 0,
  notifications: true,
  enableBlinker: true,
  blinkerGradient: "original",
};

export async function loadConfig(): Promise<Config> {
  let raw: string;
  try {
    raw = await fs.readFile(configFile, "utf8");
  } catch {
    return { ...defaultConfig };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<Config>;
    const cfg = { ...defaultConfig, ...parsed };
    if (!cfg.downloadDir || typeof cfg.downloadDir !== "string") {
      cfg.downloadDir = defaultDownloadDir;
    }
    if (typeof cfg.theme !== "string") cfg.theme = defaultConfig.theme;
    if (typeof cfg.maxConns !== "number") cfg.maxConns = defaultConfig.maxConns;
    if (typeof cfg.downloadLimit !== "number") cfg.downloadLimit = defaultConfig.downloadLimit;
    if (typeof cfg.uploadLimit !== "number") cfg.uploadLimit = defaultConfig.uploadLimit;
    if (typeof cfg.notifications !== "boolean") cfg.notifications = defaultConfig.notifications;
    if (typeof cfg.enableBlinker !== "boolean") cfg.enableBlinker = defaultConfig.enableBlinker;
    if (typeof cfg.blinkerGradient !== "string" || !["original", "dark", "light"].includes(cfg.blinkerGradient)) {
      cfg.blinkerGradient = defaultConfig.blinkerGradient;
    }
    return cfg as Config;
  } catch {
    return { ...defaultConfig };
  }
}

const write = serializeWrites();

export function saveConfig(config: Config): Promise<void> {
  return write(() => writeJsonAtomic(configFile, config));
}
