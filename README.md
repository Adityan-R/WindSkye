# TorVault ⚡

**A curated, terminal-native torrent client for legal content.**

TorVault is a lightweight, web-based torrent client designed with a retro terminal aesthetic. It focuses exclusively on legal content, providing built-in search capabilities for the Internet Archive, Linux ISOs, and open-source software.

## Features

- **Terminal Aesthetic**: A sleek, keyboard-driven UI inspired by classic terminals. 
- **Legal Content Search**: Integrated search providers to find open-source software, datasets, and public domain media without leaving the app.
- **WebTorrent Integration**: Fast and reliable torrent downloading and seeding directly from your browser interface, powered by `webtorrent`.
- **Create & Seed**: Easily create new `.torrent` files by dropping files into the browser. TorVault can automatically start seeding them immediately.
- **Real-time Updates**: Live status updates for downloads and seeding via Server-Sent Events (SSE).
- **Keyboard Navigation**: Press `/` to search, `Tab` to navigate, and use keyboard shortcuts for quick actions.

## Tech Stack

- **Backend**: Node.js, Express.js
- **Torrent Engine**: WebTorrent, create-torrent, parse-torrent
- **Frontend**: Vanilla HTML/CSS/JavaScript (Single Page Application)
- **File Uploads**: Multer

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/TorVault.git
   cd TorVault
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```
   For development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Open in Browser:**
   Navigate to `http://localhost:3000` to access the TorVault interface.

## Usage

- **Search**: Select a category from the sidebar (Archive, Linux, Software, Datasets) or simply press `/` to focus the search bar. You can paste magnet links directly into the search.
- **Download**: Press `d` (or click) on a search result to begin downloading.
- **Create**: Navigate to the "Create" view to drag and drop files, generate a `.torrent` file, and instantly start seeding.

## License

This project is licensed under the [MIT License](LICENSE).
