import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Upload images/files to Supabase Storage (bucket: chat-uploads, private).
// Replaces third-party CDN uploads. Returns a long-lived signed URL.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "chat-uploads";
const SIGNED_URL_TTL = 60 * 60 * 24 * 365; // 1 year
const MAX_BYTES = 15 * 1024 * 1024; // 15MB

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Require an authenticated Supabase user.
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "").trim();
    const { data: userData, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !userData?.user?.id) return json({ error: "unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const dataUrl = String(body.dataUrl ?? "");
    const fileName = String(body.fileName ?? "").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
    if (!dataUrl.startsWith("data:")) return json({ error: "dataUrl (base64 data URL) required" }, 400);

    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return json({ error: "invalid data URL" }, 400);
    const mime = match[1];
    const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
    if (bytes.byteLength > MAX_BYTES) return json({ error: "file too large (max 15MB)" }, 413);

    // Ensure the private bucket exists (idempotent).
    try {
      await admin.storage.createBucket(BUCKET, { public: false, fileSizeLimit: MAX_BYTES });
    } catch {
      /* already exists */
    }

    const ext = mime.split("/")[1]?.split("+")[0] || "bin";
    const path = `${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${fileName || `upload.${ext}`}`;

    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, bytes, {
      contentType: mime,
      upsert: false,
    });
    if (upErr) {
      console.error("[upload-image] upload failed:", upErr.message);
      return json({ error: `upload failed: ${upErr.message}` }, 500);
    }

    const { data: signed, error: signErr } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL);
    if (signErr || !signed?.signedUrl) {
      return json({ error: `sign failed: ${signErr?.message ?? "unknown"}` }, 500);
    }

    return json({ success: true, url: signed.signedUrl, path, bucket: BUCKET });
  } catch (e) {
    console.error("[upload-image] error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});