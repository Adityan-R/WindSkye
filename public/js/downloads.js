/* downloads.js — Download manager UI */

export class DownloadManager {
  constructor(app) {
    this.app = app;
    this.downloads = [];
    this.seeding = [];
    this.selectedDownload = -1;
    this.eventSource = null;
  }

  connect() {
    if (this.eventSource) return;
    this.eventSource = new EventSource('/api/events');
    this.eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        this.downloads = data.downloads || [];
        this.seeding = data.seeding || [];
        this.app.updateDownloadsUI(this.downloads, this.seeding, data);
      } catch (err) { /* ignore parse errors */ }
    };
    this.eventSource.onerror = () => {
      setTimeout(() => {
        this.eventSource?.close();
        this.eventSource = null;
        this.connect();
      }, 3000);
    };
  }

  async addTorrent(torrentId, source) {
    try {
      const res = await fetch('/api/torrents/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ torrentId, source }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add torrent');
      return data;
    } catch (err) {
      console.error('Add torrent error:', err);
      throw err;
    }
  }

  async pauseTorrent(infoHash) {
    const res = await fetch(`/api/torrents/${infoHash}/pause`, { method: 'POST' });
    return res.json();
  }

  async removeTorrent(infoHash, deleteFiles = false) {
    const res = await fetch(`/api/torrents/${infoHash}?deleteFiles=${deleteFiles}`, { method: 'DELETE' });
    return res.json();
  }

  getSelectedDownload() {
    if (this.selectedDownload >= 0 && this.selectedDownload < this.downloads.length) {
      return this.downloads[this.selectedDownload];
    }
    return null;
  }

  disconnect() {
    this.eventSource?.close();
    this.eventSource = null;
  }
}
