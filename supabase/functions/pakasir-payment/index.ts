const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
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

    // CREATE TRANSACTION
    if (action === "create" && req.method === "POST") {
      const body = await req.json();
      const { order_id, amount } = body;

      if (!order_id || !amount) {
        return new Response(
          JSON.stringify({ error: "Missing order_id or amount" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Creating payment:", { order_id, amount });

      const response = await fetch("https://app.pakasir.com/api/transactioncreate/qris", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: "aqualibria",
          api_key: PAKASIR_API_KEY,
          order_id: String(order_id),
          amount: Number(amount),
        }),
      });

      const text = await response.text();
      console.log("Pakasir response:", text.substring(0, 500));

      let json;
      try {
        json = JSON.parse(text);
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid response from payment gateway" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (json?.payment) {
        const fee = Number(amount) > 105000 
          ? Math.round(0.01 * Number(amount)) 
          : Math.round(0.007 * Number(amount) + 310);

        return new Response(
          JSON.stringify({
            success: true,
            payment: {
              order_id,
              amount: Number(amount),
              fee,
              total_payment: Number(amount) + fee,
              payment_number: json.payment.payment_number,
              payment_url: `https://app.pakasir.com/pay/aqualibria/${amount}?order_id=${order_id}&qris_only=1`,
              expired_at: json.payment.expired_at,
              status: "pending",
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: json?.message || "Failed to create payment", details: json }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // CHECK STATUS
    if (action === "status") {
      const order_id = url.searchParams.get("order_id");
      const amount = url.searchParams.get("amount");

      if (!order_id || !amount) {
        return new Response(
          JSON.stringify({ error: "Missing order_id or amount" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const statusUrl = `https://app.pakasir.com/api/transactiondetail?project=aqualibria&amount=${amount}&order_id=${order_id}&api_key=${PAKASIR_API_KEY}`;
      console.log("Checking status:", statusUrl.replace(PAKASIR_API_KEY, "***"));

      const response = await fetch(statusUrl);
      const text = await response.text();
      console.log("Status response:", text.substring(0, 500));

      let json;
      try {
        json = JSON.parse(text);
      } catch {
        return new Response(
          JSON.stringify({ success: true, transaction: { status: "pending" } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          transaction: json?.transaction 
            ? { status: json.transaction.status, completed_at: json.transaction.completed_at }
            : { status: "pending" },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Use ?action=create or ?action=status" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Payment error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
