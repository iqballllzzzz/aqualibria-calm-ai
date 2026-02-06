import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_API_URL = "https://app.pakasir.com";
const PAKASIR_SLUG = "aqualibria";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAKASIR_API_KEY = Deno.env.get("PAKASIR_API_KEY");
    if (!PAKASIR_API_KEY) {
      return new Response(
        JSON.stringify({ error: "PAKASIR_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "create" && req.method === "POST") {
      const { order_id, amount } = await req.json();

      if (!order_id || !amount || amount < 500) {
        return new Response(
          JSON.stringify({ error: "Invalid order_id or amount (min Rp500)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Call Pakasir API to create QRIS payment
      const response = await fetch(`${BASE_API_URL}/api/transactioncreate/qris`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: PAKASIR_SLUG,
          api_key: PAKASIR_API_KEY,
          order_id,
          amount,
          redirect_url: null,
        }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        const text = await response.text();
        console.error("Pakasir returned non-JSON:", text.substring(0, 300));
        return new Response(
          JSON.stringify({ error: "Payment gateway returned invalid response" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const json = await response.json();

      if (!json?.payment) {
        return new Response(
          JSON.stringify({ error: json?.message || "Failed to create payment" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Calculate fee for QRIS
      const fee = amount > 105000 ? Math.round(0.01 * amount) : Math.round(0.007 * amount + 310);

      return new Response(
        JSON.stringify({
          success: true,
          payment: {
            order_id,
            amount,
            fee,
            total_payment: amount + fee,
            payment_number: json.payment.payment_number,
            payment_url: `${BASE_API_URL}/pay/${PAKASIR_SLUG}/${amount}?order_id=${order_id}&qris_only=1`,
            expired_at: json.payment.expired_at,
            status: "pending",
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "status") {
      const order_id = url.searchParams.get("order_id");
      const amount = url.searchParams.get("amount");

      if (!order_id || !amount) {
        return new Response(
          JSON.stringify({ error: "Missing order_id or amount" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const response = await fetch(
        `${BASE_API_URL}/api/transactiondetail?project=${PAKASIR_SLUG}&amount=${amount}&order_id=${order_id}&api_key=${PAKASIR_API_KEY}`
      );

      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        return new Response(
          JSON.stringify({ error: "Payment gateway returned invalid response" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const json = await response.json();

      if (!json?.transaction) {
        return new Response(
          JSON.stringify({ success: true, transaction: { status: "pending" } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          transaction: {
            status: json.transaction.status,
            completed_at: json.transaction.completed_at,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use ?action=create or ?action=status" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Pakasir payment error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
