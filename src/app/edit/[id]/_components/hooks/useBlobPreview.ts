import { useState, useEffect } from "react";

/**
 * Hook to manage blob URL creation and cleanup
 * Prevents memory leaks by properly revoking URLs
 */
export const useBlobPreview = (blob: Blob | undefined | null) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob || !(blob instanceof Blob)) {
      setPreviewUrl(null);
      return;
    }

    // Create URL for the blob
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);

    // Cleanup function to revoke the URL
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [blob]);

  return previewUrl;
};
