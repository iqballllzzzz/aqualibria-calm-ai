import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "qwertyuiop@aqualibrya.id";

function planForEmail(plan: string, email: string | null | undefined): string {
  if (email && email.toLowerCase() === ADMIN_EMAIL) return "nigown";
  if (["junior", "senior", "superior", "nigown"].includes(plan)) return plan;
  return "junior";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "status"; // status | consume
    const kind = body.kind ?? "image"; // image | fullstack
    const amount = Math.max(1, Math.min(100, Number(body.amount ?? 1)));
    const requestedPlan = body.plan ?? "junior";
    const plan = planForEmail(requestedPlan, user.email);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Init / reset credits
    const { data: row, error: initErr } = await admin.rpc("get_or_init_credits", {
      _user_id: user.id,
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "consume") {
      if (!["image", "fullstack"].includes(kind)) {
        return new Response(JSON.stringify({ error: "invalid kind" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: ok, error: cErr } = await admin.rpc("consume_credit", {
        _user_id: user.id,
        _kind: kind,
        _amount: amount,
      });
      if (cErr) {
        return new Response(JSON.stringify({ error: cErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: fresh } = await admin
        .from("user_credits")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return new Response(
        JSON.stringify({ ok: !!ok, credits: fresh, reason: ok ? null : "insufficient_credits" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
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