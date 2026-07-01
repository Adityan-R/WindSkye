import WebTorrent from 'webtorrent';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DOWNLOADS_DIR = path.join(__dirname, '..', 'downloads');

// Ensure downloads directory exists
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

class TorrentManager {
  constructor() {
    this.client = new WebTorrent();
    this.torrents = new Map(); // infoHash -> metadata

    this.client.on('error', (err) => {
      console.error('[TorrentManager] Client error:', err.message);
    });
  }

  /**
   * Add a torrent by magnet URI, torrent URL, or torrent file buffer
   */
  addTorrent(torrentId, options = {}) {
    return new Promise((resolve, reject) => {
      const opts = {
        path: options.downloadPath || DOWNLOADS_DIR,
        ...options,
      };

      // Check if already added
      const existing = this.client.get(torrentId);
      if (existing) {
        resolve(this._formatTorrent(existing));
        return;
      }

      this.client.add(torrentId, opts, (torrent) => {
        this.torrents.set(torrent.infoHash, {
          addedAt: Date.now(),
          paused: false,
          source: options.source || 'manual',
        });

        torrent.on('done', () => {
          console.log(`[TorrentManager] Download complete: ${torrent.name}`);
        });

        torrent.on('error', (err) => {
          console.error(`[TorrentManager] Torrent error (${torrent.name}):`, err.message);
        });

        resolve(this._formatTorrent(torrent));
      });

      // Handle add errors via timeout
      setTimeout(() => {
        reject(new Error('Torrent add timed out after 30 seconds'));
      }, 30000);
    });
  }

  /**
   * Remove a torrent by infoHash
   */
  removeTorrent(infoHash, deleteFiles = false) {
    return new Promise((resolve, reject) => {
      const torrent = this.client.get(infoHash);
      if (!torrent) {
        reject(new Error('Torrent not found'));
        return;
      }

      torrent.destroy({ destroyStore: deleteFiles }, (err) => {
        if (err) {
          reject(err);
          return;
        }
        this.torrents.delete(infoHash);
        resolve({ success: true });
      });
    });
  }

  /**
   * Pause a torrent (deselect all files)
   */
  pauseTorrent(infoHash) {
    const torrent = this.client.get(infoHash);
    if (!torrent) throw new Error('Torrent not found');

    const meta = this.torrents.get(infoHash);
    if (meta) {
      meta.paused = !meta.paused;
      if (meta.paused) {
        torrent.pause();
      } else {
        torrent.resume();
      }
    }

    return this._formatTorrent(torrent);
  }

  /**
   * Seed files by creating a torrent from a file path
   */
  seedFiles(filePath, options = {}) {
    return new Promise((resolve, reject) => {
      this.client.seed(filePath, options, (torrent) => {
        this.torrents.set(torrent.infoHash, {
          addedAt: Date.now(),
          paused: false,
          source: 'seeding',
        });
        resolve(this._formatTorrent(torrent));
      });
    });
  }

  /**
   * Get status of a single torrent
   */
  getStatus(infoHash) {
    const torrent = this.client.get(infoHash);
    if (!torrent) return null;
    return this._formatTorrent(torrent);
  }

  /**
   * Get status of all torrents
   */
  getAllStatus() {
    const downloads = [];
    const seeding = [];

    this.client.torrents.forEach((torrent) => {
      const formatted = this._formatTorrent(torrent);
      if (torrent.done) {
        seeding.push(formatted);
      } else {
        downloads.push(formatted);
      }
    });

    return {
      downloads,
      seeding,
      downloadSpeed: this.client.downloadSpeed,
      uploadSpeed: this.client.uploadSpeed,
      ratio: this.client.ratio,
    };
  }

  /**
   * Format torrent data for API response
   */
  _formatTorrent(torrent) {
    const meta = this.torrents.get(torrent.infoHash) || {};
    return {
      infoHash: torrent.infoHash,
      name: torrent.name || 'Unknown',
      size: torrent.length || 0,
      downloaded: torrent.downloaded || 0,
      uploaded: torrent.uploaded || 0,
      progress: torrent.progress || 0,
      downloadSpeed: torrent.downloadSpeed || 0,
      uploadSpeed: torrent.uploadSpeed || 0,
      numPeers: torrent.numPeers || 0,
      ratio: torrent.ratio || 0,
      timeRemaining: torrent.timeRemaining || Infinity,
      done: torrent.done || false,
      paused: meta.paused || false,
      source: meta.source || 'unknown',
      addedAt: meta.addedAt || Date.now(),
      magnetURI: torrent.magnetURI || '',
      files: (torrent.files || []).map((f) => ({
        name: f.name,
        size: f.length,
        downloaded: f.downloaded,
        progress: f.progress,
      })),
    };
  }
}

// Singleton
export const torrentManager = new TorrentManager();
