# Beatport Downloader Chrome Extension

This Chrome extension works with the Beatport Downloader system tray application to enable one-click downloading of tracks from Beatport.

## Features

- Adds download buttons to track listings, individual track pages, and the player
- Shows download progress directly on the page
- Connects to the local PowerShell service running on port 1337
- Handles track metadata extraction (artist, title, mix, artwork)
- Supports different download qualities (FLAC, AAC 256k)
- Includes dark mode support
- Provides a popup interface for settings and queue management
- Now compatible with all Beatport track table views, including artist pages and playlists

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select this directory
4. The extension will be installed and automatically activated

## Usage

1. Make sure the Beatport Downloader service is running
2. Visit any Beatport page with tracks
3. Click the "Download" button next to any track
4. Monitor download progress in the extension popup

## Configuration

Click the extension icon to access the popup interface where you can:

- Check service connection status
- View the current download queue
- Configure service connection settings
- Set download quality preferences
- Enable or disable notifications

## Requirements

- Chrome browser
- Beatport Downloader service running on the local machine

## Development

To make changes to the extension:

1. Modify the files as needed
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Reload any Beatport pages to see your changes

## Files

- `manifest.json`: Extension configuration
- `content.js`: Injects download buttons into Beatport pages
- `background.js`: Handles communication with the local service
- `styles.css`: Styles for the injected UI elements
- `popup/`: Contains the popup interface
  - `popup.html`: Popup HTML structure
  - `popup.css`: Popup styles
  - `popup.js`: Popup functionality
- `icons/`: Extension icons in various sizes