// Base URL for hosted image assets (Google Cloud Storage bucket).
// Collaborators get images from the bucket automatically; override for a
// different bucket/CDN by setting VITE_ASSET_BASE in a .env file.
const BASE =
  (import.meta.env?.VITE_ASSET_BASE as string | undefined) ??
  "https://storage.googleapis.com/gradient-digital-group-loma-assets";

/** Resolve a stored asset path ("/providers/x.jpg") to its full hosted URL.
 *  Absolute URLs (Unsplash, loremflickr, Google photos) pass through unchanged. */
export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return path ?? null;
  if (/^https?:\/\//.test(path)) return path;
  return BASE + (path.startsWith("/") ? path : "/" + path);
}
