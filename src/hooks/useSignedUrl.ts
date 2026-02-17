import { useState, useEffect } from "react";
import { getSignedUrl, extractStoragePath } from "@/lib/signed-url";

/**
 * React hook to resolve a signed URL for a private storage object.
 * Handles both old public URLs and plain storage paths.
 */
export function useSignedUrl(
  bucket: string,
  urlOrPath: string | null | undefined
): string | null {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!urlOrPath) {
      setSignedUrl(null);
      return;
    }

    const path = extractStoragePath(urlOrPath);
    getSignedUrl(bucket, path).then((url) => setSignedUrl(url));
  }, [bucket, urlOrPath]);

  return signedUrl;
}

/**
 * Hook to resolve multiple signed URLs at once.
 */
export function useSignedUrls(
  bucket: string,
  items: { id: string; urlOrPath: string | null }[]
): Map<string, string | null> {
  const [urls, setUrls] = useState<Map<string, string | null>>(new Map());

  useEffect(() => {
    const resolve = async () => {
      const results = new Map<string, string | null>();
      await Promise.all(
        items.map(async (item) => {
          if (!item.urlOrPath) {
            results.set(item.id, null);
            return;
          }
          const path = extractStoragePath(item.urlOrPath);
          const url = await getSignedUrl(bucket, path);
          results.set(item.id, url);
        })
      );
      setUrls(results);
    };
    if (items.length > 0) resolve();
  }, [bucket, JSON.stringify(items.map((i) => i.urlOrPath))]);

  return urls;
}
