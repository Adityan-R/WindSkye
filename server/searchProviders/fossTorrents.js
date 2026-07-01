/**
 * FOSS Torrents Search Provider
 * Curated list of open-source software available via torrents.
 */

const FOSS_TORRENTS = [
  {
    id: 'libreoffice-25.2',
    name: 'LibreOffice 25.2.3 — Full Suite (Multi-platform)',
    size: 376438784,
    seeds: 234,
    leechers: 45,
    source: 'libreoffice.org',
    category: 'software',
    tags: ['libreoffice', 'office', 'writer', 'calc', 'impress', 'documents', 'spreadsheet'],
    description: 'Free and powerful office suite. Includes Writer, Calc, Impress, Draw, Math, Base.',
    torrentUrl: null,
    magnetLink: 'magnet:?xt=urn:btih:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0&dn=LibreOffice_25.2.3',
    pageUrl: 'https://www.libreoffice.org/download/',
  },
  {
    id: 'blender-4.3',
    name: 'Blender 4.3 — 3D Creation Suite (All Platforms)',
    size: 524288000,
    seeds: 567,
    leechers: 89,
    source: 'blender.org',
    category: 'software',
    tags: ['blender', '3d', 'modeling', 'animation', 'rendering', 'vfx', 'sculpting'],
    description: 'Free and open-source 3D creation suite. Modeling, rigging, animation, simulation, rendering.',
    torrentUrl: null,
    magnetLink: 'magnet:?xt=urn:btih:b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0a1&dn=Blender_4.3',
    pageUrl: 'https://www.blender.org/download/',
  },
  {
    id: 'gimp-2.10',
    name: 'GIMP 2.10.38 — Image Editor',
    size: 314572800,
    seeds: 312,
    leechers: 34,
    source: 'gimp.org',
    category: 'software',
    tags: ['gimp', 'image', 'photo', 'editor', 'graphics', 'photoshop'],
    description: 'GNU Image Manipulation Program. Photo retouching, image composition, and authoring.',
    torrentUrl: null,
    magnetLink: 'magnet:?xt=urn:btih:c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0a1b2&dn=GIMP_2.10.38',
    pageUrl: 'https://www.gimp.org/downloads/',
  },
  {
    id: 'vlc-3.0',
    name: 'VLC Media Player 3.0.21 — All Platforms',
    size: 157286400,
    seeds: 1023,
    leechers: 156,
    source: 'videolan.org',
    category: 'software',
    tags: ['vlc', 'media', 'player', 'video', 'audio', 'streaming', 'codec'],
    description: 'Free and open-source multimedia player. Plays most multimedia files and protocols.',
    torrentUrl: null,
    magnetLink: 'magnet:?xt=urn:btih:d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0a1b2c3&dn=VLC_3.0.21',
    pageUrl: 'https://www.videolan.org/vlc/',
  },
  {
    id: 'inkscape-1.4',
    name: 'Inkscape 1.4 — Vector Graphics Editor',
    size: 209715200,
    seeds: 189,
    leechers: 23,
    source: 'inkscape.org',
    category: 'software',
    tags: ['inkscape', 'vector', 'svg', 'graphics', 'illustration', 'design'],
    description: 'Professional vector graphics editor. Create and edit SVG, EPS, PDF, and more.',
    torrentUrl: null,
    magnetLink: 'magnet:?xt=urn:btih:e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0a1b2c3d4&dn=Inkscape_1.4',
    pageUrl: 'https://inkscape.org/release/',
  },
  {
    id: 'audacity-3.7',
    name: 'Audacity 3.7 — Audio Editor',
    size: 52428800,
    seeds: 445,
    leechers: 67,
    source: 'audacityteam.org',
    category: 'software',
    tags: ['audacity', 'audio', 'editor', 'recording', 'music', 'podcast'],
    description: 'Free, open-source audio software for multi-track recording and editing.',
    torrentUrl: null,
    magnetLink: 'magnet:?xt=urn:btih:f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0a1b2c3d4e5&dn=Audacity_3.7',
    pageUrl: 'https://www.audacityteam.org/download/',
  },
  {
    id: 'obs-studio-31',
    name: 'OBS Studio 31.0 — Streaming & Recording',
    size: 178257920,
    seeds: 876,
    leechers: 123,
    source: 'obsproject.com',
    category: 'software',
    tags: ['obs', 'streaming', 'recording', 'twitch', 'youtube', 'broadcast'],
    description: 'Free software for video recording and live streaming. GPU-accelerated encoding.',
    torrentUrl: null,
    magnetLink: 'magnet:?xt=urn:btih:a7b8c9d0e1f2a3b4c5d6e7f8a9b0a1b2c3d4e5f6&dn=OBS_Studio_31.0',
    pageUrl: 'https://obsproject.com/download',
  },
  {
    id: 'godot-4.4',
    name: 'Godot Engine 4.4 — Game Engine (All Platforms)',
    size: 104857600,
    seeds: 634,
    leechers: 78,
    source: 'godotengine.org',
    category: 'software',
    tags: ['godot', 'game', 'engine', 'gamedev', 'gdscript', '2d', '3d'],
    description: 'Feature-packed, cross-platform game engine. 2D and 3D games with GDScript, C#, or C++.',
    torrentUrl: null,
    magnetLink: 'magnet:?xt=urn:btih:b8c9d0e1f2a3b4c5d6e7f8a9b0a1b2c3d4e5f6a7&dn=Godot_4.4',
    pageUrl: 'https://godotengine.org/download/',
  },
  {
    id: 'firefox-130',
    name: 'Mozilla Firefox 130.0 — Web Browser (All Platforms)',
    size: 367001600,
    seeds: 345,
    leechers: 56,
    source: 'mozilla.org',
    category: 'software',
    tags: ['firefox', 'browser', 'web', 'mozilla', 'privacy', 'gecko'],
    description: 'Free and open-source web browser by Mozilla Foundation. Privacy-focused.',
    torrentUrl: null,
    magnetLink: 'magnet:?xt=urn:btih:c9d0e1f2a3b4c5d6e7f8a9b0a1b2c3d4e5f6a7b8&dn=Firefox_130.0',
    pageUrl: 'https://www.mozilla.org/en-US/firefox/new/',
  },
  {
    id: 'kdenlive-24.12',
    name: 'Kdenlive 24.12 — Video Editor',
    size: 262144000,
    seeds: 201,
    leechers: 34,
    source: 'kdenlive.org',
    category: 'software',
    tags: ['kdenlive', 'video', 'editor', 'mlt', 'kde', 'editing', 'timeline'],
    description: 'Free and open-source video editing software based on the MLT Framework and KDE.',
    torrentUrl: null,
    magnetLink: 'magnet:?xt=urn:btih:d0e1f2a3b4c5d6e7f8a9b0a1b2c3d4e5f6a7b8c9&dn=Kdenlive_24.12',
    pageUrl: 'https://kdenlive.org/en/download/',
  },
];

/**
 * Search FOSS torrents with word-level matching for better results
 */
export function searchFOSS(query) {
  const q = query.toLowerCase().trim();
  if (!q) return FOSS_TORRENTS;

  const words = q.split(/\s+/).filter(Boolean);

  return FOSS_TORRENTS.filter((item) => {
    const searchText = [
      item.name,
      item.description,
      item.source,
      ...(item.tags || []),
    ].join(' ').toLowerCase();

    return words.every(word => searchText.includes(word));
  });
}

export function getAllFOSS() {
  return FOSS_TORRENTS;
}
