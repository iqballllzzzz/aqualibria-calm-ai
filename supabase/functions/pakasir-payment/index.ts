// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://id-preview--e62bce47-cea9-435b-af2a-e3a7bda27e91.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Credentials": "true",
  };
}

const BASE_API_URL = "https://app.pakasir.com";
const PAKASIR_SLUG = "aqualibria";

// Input validation
function validateOrderId(orderId: string): boolean {
  return /^[A-Z0-9]{4,30}$/.test(orderId);
}

function validateAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount >= 500 && amount <= 10000000;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAKASIR_API_KEY = Deno.env.get("PAKASIR_API_KEY");
    if (!PAKASIR_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Payment service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "create" && req.method === "POST") {
      const body = await req.json();
      const { order_id, amount } = body;

      if (!order_id || typeof order_id !== "string" || !validateOrderId(order_id)) {
        return new Response(
          JSON.stringify({ error: "Invalid order_id format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!amount || typeof amount !== "number" || !validateAmount(amount)) {
        return new Response(
          JSON.stringify({ error: "Invalid amount (min Rp500, max Rp10.000.000)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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

      if (!order_id || !validateOrderId(order_id)) {
        return new Response(
          JSON.stringify({ error: "Invalid order_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!amount || isNaN(Number(amount))) {
        return new Response(
          JSON.stringify({ error: "Invalid amount" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const response = await fetch(
        `${BASE_API_URL}/api/transactiondetail?project=${PAKASIR_SLUG}&amount=${encodeURIComponent(amount)}&order_id=${encodeURIComponent(order_id)}&api_key=${PAKASIR_API_KEY}`
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
    const corsHeaders = getCorsHeaders(req);
    console.error("Pakasir payment error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
