// Image persistence — uploads go to Supabase Storage (bucket: chat-uploads)
// via the `upload-image` edge function. No third-party CDN.
import { supabase } from "@/integrations/supabase/client";

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

/**
 * Upload a base64 data URL or Blob to Supabase Storage.
 * Returns a long-lived signed URL.
 */
export const uploadToRyzumiCDN = async (
  input: string | Blob,
  fileName?: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    let dataUrl: string;
    if (typeof input === "string") {
      if (input.startsWith("data:")) {
        dataUrl = input;
      } else if (input.startsWith("http")) {
        // Already a URL, no need to upload
        return { success: true, url: input };
      } else {
        return { success: false, error: "Invalid input" };
      }
    } else {
      dataUrl = await blobToDataUrl(input);
    }

    const ext = dataUrl.includes("image/png") ? "png" : dataUrl.includes("image/webp") ? "webp" : "jpg";
    const name = fileName || `aqua-${Date.now()}.${ext}`;

    const { data, error } = await supabase.functions.invoke("upload-image", {
      body: { dataUrl, fileName: name },
    });

    if (error) throw new Error(error.message || "Upload failed");
    if (data?.success && data?.url) {
      return { success: true, url: data.url };
    }
    return { success: false, error: data?.error || "Upload returned no URL" };
  } catch (error: any) {
    console.error("Storage upload error:", error);
    return { success: false, error: error.message || "Upload failed" };
  }
};

/**
 * Persist any image (base64 or blob) to Supabase Storage, returns permanent URL
 * Falls back to original URL if upload fails
 */
export const persistImageToCDN = async (imageUrl: string): Promise<string> => {
  if (!imageUrl) return imageUrl;
  // Already a permanent URL (not base64)
  if (!imageUrl.startsWith("data:")) return imageUrl;

  // Retry up to 2 times
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await uploadToRyzumiCDN(imageUrl);
    if (result.success && result.url) {
      return result.url;
    }
    console.warn(`Storage upload attempt ${attempt + 1} failed:`, result.error);
    if (attempt < 1) await new Promise(r => setTimeout(r, 1000));
  }
  console.warn("Storage upload failed after retries, returning original");
  return imageUrl;
};
