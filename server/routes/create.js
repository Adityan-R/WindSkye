import { Router } from 'express';
import multer from 'multer';
import createTorrent from 'create-torrent';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { torrentManager } from '../torrentManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Multer config for file uploads
const upload = multer({
  dest: path.join(__dirname, '..', '..', 'uploads'),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
});

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * POST /api/create
 * Upload files and create a .torrent file
 * Multipart form: files[] + optional fields: name, comment, trackers
 */
router.post('/', upload.array('files', 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  try {
    const { name, comment, startSeeding } = req.body;

    // Move uploaded files to a named directory
    const torrentName = name || `windskye-${Date.now()}`;
    const torrentDir = path.join(uploadsDir, torrentName);
    if (!fs.existsSync(torrentDir)) {
      fs.mkdirSync(torrentDir, { recursive: true });
    }

    // Move files
    for (const file of req.files) {
      const dest = path.join(torrentDir, file.originalname);
      fs.renameSync(file.path, dest);
    }

    // Create torrent
    const opts = {
      name: torrentName,
      comment: comment || 'Created with Windskye',
      createdBy: 'Windskye 1.0.0',
      announceList: [
        ['udp://tracker.opentrackr.org:1337/announce'],
        ['udp://open.stealth.si:80/announce'],
        ['udp://tracker.openbittorrent.com:6969/announce'],
        ['udp://exodus.desync.com:6969/announce'],
      ],
    };

    const torrentBuf = await new Promise((resolve, reject) => {
      createTorrent(torrentDir, opts, (err, torrent) => {
        if (err) reject(err);
        else resolve(torrent);
      });
    });

    // Save .torrent file
    const torrentFilePath = path.join(uploadsDir, `${torrentName}.torrent`);
    fs.writeFileSync(torrentFilePath, torrentBuf);

    let seedInfo = null;
    if (startSeeding === 'true' || startSeeding === true) {
      seedInfo = await torrentManager.seedFiles(torrentDir, { name: torrentName });
    }

    // Send the .torrent file as download
    res.json({
      success: true,
      torrentFile: `/api/create/download/${torrentName}.torrent`,
      name: torrentName,
      files: req.files.map((f) => f.originalname),
      seeding: seedInfo,
    });
  } catch (error) {
    console.error('[Create] Error:', error.message);
    res.status(500).json({ error: 'Failed to create torrent', message: error.message });
  }
});

/**
 * GET /api/create/download/:filename
 * Download a created .torrent file
 */
router.get('/download/:filename', (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Torrent file not found' });
  }
  res.download(filePath);
});

export default router;
