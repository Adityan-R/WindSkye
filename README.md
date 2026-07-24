<img width="615" height="132" alt="windskye_readme_header" src="https://github.com/user-attachments/assets/8857dfbb-3093-463b-b7ae-4338cc352128" />

[![Version](https://img.shields.io/badge/version-1.1.1-blue.svg)](https://github.com/Adityan-R/WindSkye)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

WindSkye is a lightweight, zero-configuration terminal application for searching, tracking, and downloading torrents. Engineered for speed and minimal resource usage, it queries top indexing sources simultaneously, delivering real-time swarm statistics and seamless background downloads directly in your terminal.

<img width="1276" height="733" alt="image" src="https://github.com/user-attachments/assets/c5671cf2-2be3-4a7c-b8d2-5f5738cea1ef" />


## Requirements

- Node.js (v22 or higher)

## Quick Start

Launch WindSkye instantly without any global installation using `npx`:

```sh
npx windskye
```

Alternatively, pass CLI arguments to jump straight into action:

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
- **Privacy Focused:** WindSkye interacts directly with the BitTorrent network. No central servers, no telemetry, no tracking.

## Tech Stack

- **UI Framework:** React 19 + Ink 7 (Terminal Component System)
- **Torrent Engine:** WebTorrent
- **Language & Runtime:** TypeScript 6, Node.js (>=22)
- **Bundler:** tsup

## Development

To build WindSkye from source and run it locally:

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

Pull requests are welcome. Please ensure that all changes pass the TypeScript compiler checks (`npm run typecheck`) and tests (`npm test`).

## Legal Disclaimer

WindSkye is a decentralized, peer-to-peer file sharing tool. Users are solely responsible for ensuring they have the legal right to download and distribute the content they interact with. The developers of WindSkye do not endorse or support copyright infringement.

