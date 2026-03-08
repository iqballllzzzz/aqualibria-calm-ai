// Ryzumi CDN Upload Utility
const RYZUMI_CDN_URL = "https://api.ryzumi.net/api/uploader/ryzumicdn";

/**
 * Upload a base64 data URL or Blob to Ryzumi CDN
 * Returns the permanent CDN URL
 */
export const uploadToRyzumiCDN = async (
  input: string | Blob,
  fileName?: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    let blob: Blob;

    if (typeof input === "string") {
      if (input.startsWith("data:")) {
        // Convert base64 data URL to blob
        const res = await fetch(input);
        blob = await res.blob();
      } else if (input.startsWith("http")) {
        // Already a URL, no need to upload
        return { success: true, url: input };
      } else {
        return { success: false, error: "Invalid input" };
      }
    } else {
      blob = input;
    }

    const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
    const name = fileName || `aqua-${Date.now()}.${ext}`;

    const formData = new FormData();
    formData.append("file", blob, name);

    const response = await fetch(RYZUMI_CDN_URL, {
      method: "POST",
      headers: { accept: "application/json" },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`CDN upload failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.url) {
      return { success: true, url: data.url };
    }

    return { success: false, error: "CDN upload returned no URL" };
  } catch (error: any) {
    console.error("CDN upload error:", error);
    return { success: false, error: error.message || "Upload failed" };
  }
};

/**
 * Persist any image (base64 or blob) to CDN, returns permanent URL
 * Falls back to original URL if upload fails
 */
export const persistImageToCDN = async (imageUrl: string): Promise<string> => {
  if (!imageUrl) return imageUrl;
  // Already a permanent URL (not base64)
  if (!imageUrl.startsWith("data:")) return imageUrl;

  const result = await uploadToRyzumiCDN(imageUrl);
  if (result.success && result.url) {
    return result.url;
  }
  console.warn("CDN upload failed, returning original:", result.error);
  return imageUrl;
};
