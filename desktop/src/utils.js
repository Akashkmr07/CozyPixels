/**
 * Convert a wallpaper filename to a display-friendly name.
 * Strips extension, replaces dashes/underscores with spaces, and capitalises each word.
 */
export function formatWallpaperName(name) {
  return name
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
