# Changelog

## [1.3.0] - 2026-08-26

### Fixed

- Fixed static wallpapers not appearing after a live wallpaper was active.
- Fixed normal wallpaper cards and previews failing when a cached image URL was invalid.
- Added CDN fallback when a local cached image cannot be loaded.
- Fixed live wallpaper desktop-host detection with a Windows shell fallback.
- Fixed local video URLs and video playback permissions in the desktop webview.
- Prevented browser mode from throwing raw Tauri API errors.
- Prevented Set Both from changing the lock screen when wallpaper application fails.

### Improved

- Added safer handling for missing wallpaper data and failed wallpaper actions.
- Added live wallpaper window permissions and improved desktop window sizing.
