import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "qwertyuiop@aqualibrya.id";

const VALID_PLANS = ["junior", "senior", "superior", "nigown"] as const;

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized));
  } catch {
    return null;
  }
}

function resolvePlan(requestedPlan: string, email: string | null | undefined): string {
  // Admin always nigown — cannot be downgraded by client.
  if (email && email.toLowerCase() === ADMIN_EMAIL) return "nigown";
  const normalizedPlan = requestedPlan === "free" ? "junior" : requestedPlan === "pro" || requestedPlan === "high" ? "superior" : requestedPlan;
  // Non-admin users CANNOT request nigown — strip it.
  if (normalizedPlan === "nigown") return "junior";
  if ((VALID_PLANS as readonly string[]).includes(normalizedPlan)) return normalizedPlan;
  return "junior";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "").trim();
    const jwtPayload = decodeJwtPayload(token);
    if (jwtPayload?.role !== "authenticated" || jwtPayload?.aud !== "authenticated") {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userData, error: authErr } = await userClient.auth.getUser(token);
    if (authErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "status");
    if (!["status", "consume"].includes(action)) {
      return new Response(JSON.stringify({ error: "invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const kind = String(body.kind ?? "image");
    const amount = Math.max(1, Math.min(100, Number(body.amount ?? 1)));
    const requestedPlan = String(body.plan ?? "junior");
    const plan = resolvePlan(requestedPlan, userEmail);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Init / reset credits
    const { data: row, error: initErr } = await admin.rpc("get_or_init_credits", {
      _user_id: userId,
      _plan: plan,
    });
    if (initErr) {
      return new Response(JSON.stringify({ error: initErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "status") {
      return new Response(JSON.stringify({ ok: true, credits: row }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      });
    }

    if (action === "consume") {
      if (!["image", "fullstack", "slides", "designer"].includes(kind)) {
        return new Response(JSON.stringify({ error: "invalid kind" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: result, error: cErr } = await admin.rpc("consume_credit", {
        _user_id: userId,
        _kind: kind,
        _amount: amount,
      });
      if (cErr) {
        return new Response(JSON.stringify({ error: cErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const ok = !!result?.ok;
      return new Response(
        JSON.stringify({ ok, credits: result?.credits ?? row, reason: ok ? null : result?.reason ?? "insufficient_credits", source: result?.source ?? null }),
        {
          status: ok ? 200 : 402,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        },
      );
    }

    return new Response(JSON.stringify({ error: "unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});