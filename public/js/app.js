/* app.js — Main application controller */

import { KeyboardManager } from './keyboard.js';
import { SearchManager } from './search.js';
import { DownloadManager } from './downloads.js';

class TorVaultApp {
  constructor() {
    this.currentView = 'landing';
    this.currentCategory = 'all';
    this.paneIndex = 0; // 0 = sidebar, 1 = content
    this.search = new SearchManager(this);
    this.downloads = new DownloadManager(this);
    this.keyboard = new KeyboardManager(this);

    this._cacheElements();
    this._bindEvents();
    this._updateStatusBar();
    this.downloads.connect();
    this._typeSubtitle();
  }

  _cacheElements() {
    this.$ = {
      sidebar: document.getElementById('sidebar'),
      navItems: document.querySelectorAll('.nav-item[data-view]'),
      views: document.querySelectorAll('.view'),
      contentPane: document.getElementById('content-pane'),
      searchLanding: document.getElementById('search-input-landing'),
      searchResults: document.getElementById('search-input-results'),
      resultsBody: document.getElementById('results-body'),
      resultsCount: document.getElementById('results-count'),
      resultsSources: document.getElementById('results-sources'),
      resultsEmpty: document.getElementById('results-empty'),
      resultsLoading: document.getElementById('results-loading'),
      resultsTableWrap: document.getElementById('results-table-wrap'),
      downloadsList: document.getElementById('downloads-list'),
      downloadsEmpty: document.getElementById('downloads-empty'),
      downloadsCount: document.getElementById('downloads-count'),
      seedingList: document.getElementById('seeding-list'),
      seedingEmpty: document.getElementById('seeding-empty'),
      seedingCount: document.getElementById('seeding-count'),
      dlBadge: document.getElementById('dl-badge'),
      seedBadge: document.getElementById('seed-badge'),
      statusShortcuts: document.getElementById('status-shortcuts'),
      statusSpeed: document.getElementById('status-speed'),
      subtitle: document.getElementById('app-subtitle'),
      createBtn: document.getElementById('create-btn'),
      createFiles: document.getElementById('create-files'),
      createName: document.getElementById('create-name'),
      createComment: document.getElementById('create-comment'),
      createSeed: document.getElementById('create-seed'),
      createResult: document.getElementById('create-result'),
      dropZone: document.getElementById('drop-zone'),
      fileList: document.getElementById('file-list'),
      detailPanel: document.getElementById('torrent-detail'),
      detailName: document.getElementById('detail-name'),
      detailBody: document.getElementById('detail-body'),
      detailClose: document.getElementById('detail-close'),
    };
  }

  _bindEvents() {
    // Nav items
    this.$.navItems.forEach((item) => {
      item.addEventListener('click', () => {
        const view = item.dataset.view;
        if (['all', 'archive', 'linux', 'software', 'datasets'].includes(view)) {
          this.currentCategory = view;
          this.search.category = view;
          if (this.search.query) {
            this.switchView('results');
            this.search.search(this.search.query, view);
          } else {
            this.switchView('landing');
          }
        } else {
          this.switchView(view);
        }
        this._setActiveNav(view);
      });
    });

    // Landing search
    this.$.searchLanding.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.submitSearch();
      }
    });

    // Results search
    this.$.searchResults.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.submitSearch();
      }
    });

    // Category pills
    document.querySelectorAll('.cat-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const cat = pill.dataset.cat || pill.textContent.trim();
        this.currentCategory = cat;
        this.search.category = cat;
        this._setActiveNav(cat);
        this.focusSearch();
      });
    });

    // Create torrent
    this.$.dropZone.addEventListener('click', () => this.$.createFiles.click());
    this.$.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.$.dropZone.classList.add('drag-over');
    });
    this.$.dropZone.addEventListener('dragleave', () => {
      this.$.dropZone.classList.remove('drag-over');
    });
    this.$.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.$.dropZone.classList.remove('drag-over');
      this._handleFiles(e.dataTransfer.files);
    });
    this.$.createFiles.addEventListener('change', (e) => {
      this._handleFiles(e.target.files);
    });
    this.$.createBtn.addEventListener('click', () => this._createTorrent());
    this.$.detailClose.addEventListener('click', () => this.closeDetail());
  }

  // ── View Management ──

  switchView(view) {
    this.currentView = view;
    this.$.views.forEach((v) => v.classList.remove('active'));

    let targetView = view;
    if (['all', 'archive', 'linux', 'software', 'datasets'].includes(view)) {
      targetView = this.search.results.length > 0 ? 'results' : 'landing';
    }

    const el = document.getElementById(`view-${targetView}`);
    if (el) el.classList.add('active');
    this._updateStatusBar();
  }

  _setActiveNav(view) {
    this.$.navItems.forEach((item) => {
      item.classList.toggle('active', item.dataset.view === view);
    });
  }

  // ── Search ──

  focusSearch() {
    if (this.currentView === 'landing' || this.currentView === 'all') {
      this.$.searchLanding.focus();
    } else {
      this.$.searchResults.focus();
    }
  }

  submitSearch() {
    const input = this.currentView === 'landing' || this.currentView === 'all'
      ? this.$.searchLanding : this.$.searchResults;
    const q = input.value.trim();
    if (!q) return;

    this.$.searchResults.value = q;
    this.$.searchLanding.value = q;
    this.switchView('results');
    this.search.search(q, this.currentCategory);
  }

  showLoading(show) {
    this.$.resultsLoading.classList.toggle('hidden', !show);
    this.$.resultsTableWrap.classList.toggle('hidden', show);
    this.$.resultsEmpty.classList.add('hidden');
  }

  renderResults(results, meta) {
    this.$.resultsBody.innerHTML = '';

    if (results.length === 0) {
      this.$.resultsEmpty.classList.remove('hidden');
      this.$.resultsTableWrap.classList.add('hidden');
      this.$.resultsCount.textContent = '0 results';
      this.$.resultsSources.textContent = '';
      return;
    }

    this.$.resultsEmpty.classList.add('hidden');
    this.$.resultsTableWrap.classList.remove('hidden');
    this.$.resultsCount.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;
    this.$.resultsSources.textContent = meta.sources ? `· ${meta.sources.join(', ')}` : '';

    results.forEach((r, i) => {
      const tr = document.createElement('tr');
      tr.dataset.index = i;
      if (i === this.search.selectedIndex) tr.classList.add('selected');

      tr.innerHTML = `
        <td class="col-idx"><span class="result-arrow">❯</span>${i + 1}</td>
        <td class="col-name" title="${this._esc(r.name)}">${this._esc(r.name)}</td>
        <td class="col-size">${this._formatSize(r.size)}</td>
        <td class="col-seeds"><span class="seed-count">${r.seeds || '?'}</span>:<span class="leech-count">${r.leechers || '?'}</span></td>
        <td class="col-source"><span class="result-source">${this._esc(this._shortSource(r.source))}</span></td>
      `;

      tr.addEventListener('click', () => {
        this.search.selectedIndex = i;
        this.highlightResult(i);
      });

      tr.addEventListener('dblclick', () => {
        this.search.selectedIndex = i;
        this.downloadSelected();
      });

      this.$.resultsBody.appendChild(tr);
    });
  }

  highlightResult(index) {
    const rows = this.$.resultsBody.querySelectorAll('tr');
    rows.forEach((r, i) => r.classList.toggle('selected', i === index));
    rows[index]?.scrollIntoView({ block: 'nearest' });
  }

  // ── Downloads ──

  async addTorrent(torrentId, source) {
    try {
      await this.downloads.addTorrent(torrentId, source);
      this.switchView('downloads');
      this._setActiveNav('downloads');
    } catch (err) {
      alert(`Failed to add torrent: ${err.message}`);
    }
  }

  async downloadSelected() {
    const item = this.search.getSelected();
    if (!item) return;
    const id = item.magnetLink || item.torrentUrl;
    if (!id) {
      alert('No download link available for this item.');
      return;
    }
    await this.addTorrent(id, item.source);
  }

  async pauseSelected() {
    const dl = this.downloads.getSelectedDownload();
    if (dl) await this.downloads.pauseTorrent(dl.infoHash);
  }

  async cancelSelected() {
    const dl = this.downloads.getSelectedDownload();
    if (dl) {
      if (confirm(`Remove "${dl.name}"?`)) {
        await this.downloads.removeTorrent(dl.infoHash, true);
      }
    }
  }

  updateDownloadsUI(downloadsList, seedingList, data) {
    // Update badges
    this._updateBadge(this.$.dlBadge, downloadsList.length);
    this._updateBadge(this.$.seedBadge, seedingList.length);
    this.$.downloadsCount.textContent = downloadsList.length;
    this.$.seedingCount.textContent = seedingList.length;

    // Update speed in status bar
    const dlSpeed = this._formatSpeed(data.downloadSpeed || 0);
    const ulSpeed = this._formatSpeed(data.uploadSpeed || 0);
    this.$.statusSpeed.textContent = dlSpeed || ulSpeed
      ? `↓ ${dlSpeed}  ↑ ${ulSpeed}` : '';

    // Render downloads
    this._renderTorrentList(this.$.downloadsList, downloadsList, false);
    this.$.downloadsEmpty.classList.toggle('hidden', downloadsList.length > 0);

    // Render seeding
    this._renderTorrentList(this.$.seedingList, seedingList, true);
    this.$.seedingEmpty.classList.toggle('hidden', seedingList.length > 0);
  }

  _renderTorrentList(container, items, isSeeding) {
    // Update existing items or create new ones
    const existingMap = new Map();
    container.querySelectorAll('.torrent-item').forEach((el) => {
      existingMap.set(el.dataset.hash, el);
    });

    const currentHashes = new Set(items.map((t) => t.infoHash));

    // Remove items no longer present
    existingMap.forEach((el, hash) => {
      if (!currentHashes.has(hash)) el.remove();
    });

    items.forEach((t, i) => {
      let el = existingMap.get(t.infoHash);
      if (!el) {
        el = document.createElement('div');
        el.className = 'torrent-item';
        el.dataset.hash = t.infoHash;
        el.addEventListener('click', () => {
          container.querySelectorAll('.torrent-item').forEach((e) => e.classList.remove('selected'));
          el.classList.add('selected');
          this.downloads.selectedDownload = i;
        });
        container.appendChild(el);
      }

      const pct = Math.round(t.progress * 100);
      const icon = isSeeding ? '↑' : (t.paused ? '⏸' : '↓');
      const eta = t.timeRemaining && t.timeRemaining < Infinity
        ? this._formatTime(t.timeRemaining) : '';

      el.innerHTML = `
        <div class="torrent-row-top">
          <span class="torrent-icon">${icon}</span>
          <span class="torrent-name">${this._esc(t.name)}</span>
          <span class="torrent-size">${this._formatSize(t.size)}</span>
          <span class="torrent-source-tag">${this._esc(this._shortSource(t.source))}</span>
        </div>
        <div class="torrent-row-progress">
          <div class="progress-bar-wrap">
            <div class="progress-bar ${pct >= 100 ? 'complete' : ''}" style="width: ${pct}%"></div>
            <div class="progress-bar-text">${pct}%</div>
          </div>
          <div class="torrent-stats">
            <span class="stat-speed">${this._formatSpeed(isSeeding ? t.uploadSpeed : t.downloadSpeed)}</span>
            <span class="stat-peers">+${t.numPeers}</span>
            ${eta ? `<span class="stat-eta">${eta}</span>` : ''}
          </div>
        </div>
      `;
    });
  }

  // ── Create Torrent ──

  _selectedFiles = [];

  _handleFiles(fileListObj) {
    const newFiles = Array.from(fileListObj);
    this._selectedFiles.push(...newFiles);
    this._renderFileList();
    this.$.createBtn.disabled = this._selectedFiles.length === 0;
  }

  _renderFileList() {
    this.$.fileList.innerHTML = '';
    this._selectedFiles.forEach((f, i) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>📄 ${this._esc(f.name)}</span>
        <span class="file-size">${this._formatSize(f.size)}</span>
        <span class="file-remove" data-idx="${i}">✕</span>
      `;
      li.querySelector('.file-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        this._selectedFiles.splice(i, 1);
        this._renderFileList();
        this.$.createBtn.disabled = this._selectedFiles.length === 0;
      });
      this.$.fileList.appendChild(li);
    });
  }

  async _createTorrent() {
    if (this._selectedFiles.length === 0) return;

    this.$.createBtn.disabled = true;
    this.$.createBtn.textContent = 'Creating...';

    try {
      const formData = new FormData();
      this._selectedFiles.forEach((f) => formData.append('files', f));
      formData.append('name', this.$.createName.value || `torvault-${Date.now()}`);
      formData.append('comment', this.$.createComment.value || 'Created with TorVault');
      formData.append('startSeeding', this.$.createSeed.checked ? 'true' : 'false');

      const res = await fetch('/api/create', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to create torrent');

      this.$.createResult.classList.remove('hidden');
      this.$.createResult.innerHTML = `
        ✅ Torrent created! <a href="${data.torrentFile}" download style="color: var(--accent-light);">Download .torrent file</a>
        ${data.seeding ? '<br>🌱 Seeding started.' : ''}
      `;

      this._selectedFiles = [];
      this._renderFileList();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      this.$.createBtn.disabled = false;
      this.$.createBtn.innerHTML = '<span>[ ⚡ create .torrent ]</span>';
    }
  }

  // ── Navigation ──

  switchPane() {
    this.paneIndex = (this.paneIndex + 1) % 2;
    if (this.paneIndex === 0) {
      this.$.sidebar.focus();
    } else {
      this.$.contentPane.focus();
    }
  }

  navigateList(direction) {
    if (this.currentView === 'results') {
      this.search.navigate(direction);
    } else if (this.currentView === 'downloads') {
      const list = this.downloads.downloads;
      if (list.length === 0) return;
      this.downloads.selectedDownload = Math.max(0,
        Math.min(list.length - 1, this.downloads.selectedDownload + direction));
      const items = this.$.downloadsList.querySelectorAll('.torrent-item');
      items.forEach((el, i) => el.classList.toggle('selected', i === this.downloads.selectedDownload));
    }
  }

  selectCurrent() {
    if (this.currentView === 'results') {
      this.downloadSelected();
    }
  }

  closeDetail() {
    this.$.detailPanel.classList.add('hidden');
  }

  showHelp() {
    this.$.detailPanel.classList.remove('hidden');
    this.$.detailName.textContent = 'Keyboard Shortcuts';
    this.$.detailBody.innerHTML = `
      <table style="width:100%;font-size:0.82rem;">
        <tr><td><kbd>/</kbd></td><td style="padding:4px 12px">Focus search</td></tr>
        <tr><td><kbd>d</kbd></td><td style="padding:4px 12px">Download selected</td></tr>
        <tr><td><kbd>p</kbd></td><td style="padding:4px 12px">Pause / Resume</td></tr>
        <tr><td><kbd>c</kbd></td><td style="padding:4px 12px">Cancel download</td></tr>
        <tr><td><kbd>Tab</kbd></td><td style="padding:4px 12px">Switch pane</td></tr>
        <tr><td><kbd>↑ ↓</kbd></td><td style="padding:4px 12px">Navigate list</td></tr>
        <tr><td><kbd>Enter</kbd></td><td style="padding:4px 12px">Select / Download</td></tr>
        <tr><td><kbd>Esc</kbd></td><td style="padding:4px 12px">Close panel</td></tr>
        <tr><td><kbd>?</kbd></td><td style="padding:4px 12px">Show this help</td></tr>
      </table>
    `;
  }

  // ── Status Bar ──

  _updateStatusBar() {
    const shortcuts = {
      landing: [
        { key: '/', label: 'search' },
        { key: 'tab', label: 'navigate' },
        { key: '?', label: 'help' },
      ],
      results: [
        { key: 'd', label: 'download' },
        { key: '/', label: 'search' },
        { key: '↑↓', label: 'navigate' },
        { key: 'tab', label: 'pane' },
        { key: '?', label: 'help' },
      ],
      downloads: [
        { key: 'p', label: 'pause' },
        { key: 'c', label: 'cancel' },
        { key: 'tab', label: 'pane' },
        { key: '?', label: 'help' },
      ],
      seeding: [
        { key: 'c', label: 'stop' },
        { key: 'tab', label: 'pane' },
        { key: '?', label: 'help' },
      ],
      create: [
        { key: 'tab', label: 'pane' },
        { key: '?', label: 'help' },
      ],
    };

    const sc = shortcuts[this.currentView] || shortcuts.landing;
    this.$.statusShortcuts.innerHTML = sc.map((s) =>
      `<span class="shortcut"><kbd>${s.key}</kbd> ${s.label}</span>`
    ).join('');
  }

  // ── Typewriter Effect ──

  _typeSubtitle() {
    const text = '/ search  ·  find anything across every source  ·  esc close  ·  ? help';
    let i = 0;
    const type = () => {
      if (i <= text.length) {
        this.$.subtitle.textContent = text.substring(0, i);
        i++;
        setTimeout(type, 25);
      }
    };
    setTimeout(type, 600);
  }

  // ── Helpers ──

  _updateBadge(el, count) {
    if (count > 0) {
      el.classList.remove('hidden');
      el.textContent = count;
    } else {
      el.classList.add('hidden');
    }
  }

  _formatSize(bytes) {
    if (!bytes || bytes === 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
    return `${size.toFixed(size < 10 ? 2 : 1)} ${units[i]}`;
  }

  _formatSpeed(bytesPerSec) {
    if (!bytesPerSec || bytesPerSec === 0) return '0 B/s';
    return `${this._formatSize(bytesPerSec)}/s`;
  }

  _formatTime(ms) {
    if (!ms || ms === Infinity) return '';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  }

  _shortSource(source) {
    if (!source) return '?';
    return source.replace(/\.org$|\.com$|\.io$/, '').substring(0, 8);
  }

  _esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  window.app = new TorVaultApp();
});
