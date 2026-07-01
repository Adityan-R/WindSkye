import { Router } from 'express';
import { torrentManager } from '../torrentManager.js';

const router = Router();

/**
 * POST /api/torrents/add
 * Body: { torrentId: "magnet:..." | "https://...torrent" }
 */
router.post('/add', async (req, res) => {
  const { torrentId, source } = req.body;

  if (!torrentId) {
    return res.status(400).json({ error: 'torrentId is required (magnet URI or torrent URL)' });
  }

  try {
    const torrent = await torrentManager.addTorrent(torrentId, { source });
    res.json({ success: true, torrent });
  } catch (error) {
    console.error('[Torrents] Add error:', error.message);
    res.status(500).json({ error: 'Failed to add torrent', message: error.message });
  }
});

/**
 * GET /api/torrents/status
 * Returns status of all torrents
 */
router.get('/status', (req, res) => {
  const status = torrentManager.getAllStatus();
  res.json(status);
});

/**
 * GET /api/torrents/:infoHash
 * Returns status of a specific torrent
 */
router.get('/:infoHash', (req, res) => {
  const status = torrentManager.getStatus(req.params.infoHash);
  if (!status) {
    return res.status(404).json({ error: 'Torrent not found' });
  }
  res.json(status);
});

/**
 * POST /api/torrents/:infoHash/pause
 * Toggle pause/resume for a torrent
 */
router.post('/:infoHash/pause', (req, res) => {
  try {
    const torrent = torrentManager.pauseTorrent(req.params.infoHash);
    res.json({ success: true, torrent });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * DELETE /api/torrents/:infoHash
 * Remove a torrent
 */
router.delete('/:infoHash', async (req, res) => {
  const { deleteFiles } = req.query;

  try {
    await torrentManager.removeTorrent(req.params.infoHash, deleteFiles === 'true');
    res.json({ success: true });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

export default router;
