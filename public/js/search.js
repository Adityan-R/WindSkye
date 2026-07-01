/* search.js — Search panel logic */

export class SearchManager {
  constructor(app) {
    this.app = app;
    this.results = [];
    this.selectedIndex = -1;
    this.query = '';
    this.category = 'all';
    this._debounceTimer = null;
  }

  async search(query, category) {
    this.query = query;
    this.category = category || this.category;
    if (!query.trim()) return;

    // Check if it's a magnet link
    if (query.startsWith('magnet:')) {
      this.app.addTorrent(query);
      return;
    }

    this.app.showLoading(true);

    try {
      const params = new URLSearchParams({ q: query, category: this.category });
      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();

      this.results = data.results || [];
      this.selectedIndex = this.results.length > 0 ? 0 : -1;
      this.app.renderResults(this.results, data);
    } catch (err) {
      console.error('Search error:', err);
      this.results = [];
      this.app.renderResults([], { error: err.message });
    } finally {
      this.app.showLoading(false);
    }
  }

  getSelected() {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.results.length) {
      return this.results[this.selectedIndex];
    }
    return null;
  }

  navigate(direction) {
    if (this.results.length === 0) return;
    this.selectedIndex = Math.max(0, Math.min(this.results.length - 1, this.selectedIndex + direction));
    this.app.highlightResult(this.selectedIndex);
  }
}
