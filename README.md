# Windskye

A high-performance, terminal-native torrent client and search engine.

<img width="1239" height="645" alt="image" src="https://github.com/user-attachments/assets/2a1315a1-30a6-4939-b3be-1c74214ff42b" />

## Overview

Windskye provides a streamlined, zero-configuration command-line interface for querying, managing, and downloading torrents. Designed for maximum efficiency and minimal resource footprint, it aggregates results from reputable indexing sources concurrently, providing real-time peer statistics and direct downloads straight from your terminal.

## Sources it searches from

Windskye ships with a curated list of reputable torrent (trusted my many others, yours included) indexes to provide high-quality search results out of the box. These soruces will be added on or will be updated as the time goes.

| Category | Sources |
|----------|---------|
| Games | FitGirl |
| Movies | YTS, The Pirate Bay, 1337x |
| TV | EZTV, SolidTorrents, The Pirate Bay, 1337x |
| Anime | Nyaa, SubsPlease |

## Requirements

- Node.js (v18 or higher)

## Quick Start

You can launch Windskye immediately without installing it globally by using `npx`:

```sh
npx windskye
```

Alternatively, you can provide initial arguments to bypass the startup screen:

```sh
# Start a download immediately via magnet link
npx windskye "magnet:?xt=urn:btih:..."

# Open a local .torrent file
npx windskye path/to/file.torrent
```

## Key Features

- **Concurrent Aggregation:** Queries multiple public trackers and indexes simultaneously for the fastest possible results.
- **Modern TUI:** A highly responsive, keyboard-navigable terminal user interface built with React Ink.
- **Background Processing:** Seamlessly queue multiple torrents. Downloads run persistently in the background while you continue to browse.
- **Granular Controls:** Full control over active connections, bandwidth, and seed states.
- **Privacy Focused:** Windskye interacts directly with the BitTorrent network. No central servers, no telemetry, no tracking.

## Development

To build Windskye from source and run it locally:

1. Clone the repository and navigate into the directory.
2. Install dependencies:
   ```sh
   npm install
   ```
3. Run the development environment:
   ```sh
   npm run dev
   ```

To build a production bundle:
```sh
npm run build
node dist/cli.cjs
```

## Contributing

Pull requests are welcome. Please ensure that all changes pass the TypeScript compiler checks and adhere to the existing code formatting standards.

## Legal Disclaimer

Windskye is a decentralized peer-to-peer file sharing tool. Users are solely responsible for ensuring they have the legal right to download and distribute the content they interact with. The developers of Windskye do not endorse or support copyright infringement.
