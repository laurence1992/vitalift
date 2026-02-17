import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, { url: string; expires: number }>();

/**
 * Get a signed URL for a private storage object.
 * Caches for 50 minutes (URLs expire in 60 min).
 */
export async function getSignedUrl(
  bucket: string,
  path: string
): Promise<string | null> {
  if (!path) return null;

  const key = `${bucket}/${path}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.url;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600); // 1 hour

  if (error || !data?.signedUrl) return null;

  cache.set(key, { url: data.signedUrl, expires: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}

/**
 * Extract the storage path from a full public URL or return as-is if already a path.
 * Handles both old publicUrl format and plain path format.
 */
export function extractStoragePath(urlOrPath: string): string {
  // If it's already a plain path (no http), return as-is
  if (!urlOrPath.startsWith("http")) return urlOrPath;

  // Extract path from Supabase public URL pattern:
  // .../storage/v1/object/public/bucket-name/userId/file.ext
  const match = urlOrPath.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
  if (match) return match[1];

  return urlOrPath;
}
