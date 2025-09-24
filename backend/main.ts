// Stripe Alternative MVP - Deno Backend
// Deploy to Deno Deploy or Supabase Edge Functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://mock-project.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "mock-service-role-key";
const PRIMER_API_KEY = Deno.env.get("PRIMER_API_KEY") || "mock-primer-key";
const PRIMER_WEBHOOK_SECRET = Deno.env.get("PRIMER_WEBHOOK_SECRET") || "mock-primer-secret";
const PRIMER_ENV = Deno.env.get("PRIMER_ENV") || "sandbox";
const COINBASE_COMMERCE_API_KEY = Deno.env.get("COINBASE_COMMERCE_API_KEY") || "mock-coinbase-key";
const COINBASE_COMMERCE_WEBHOOK_SECRET = Deno.env.get("COINBASE_COMMERCE_WEBHOOK_SECRET") || "mock-coinbase-secret";

// Mock mode flags - Enhanced for VC demos
const PRIMER_MOCK_MODE = !Deno.env.get("PRIMER_API_KEY") || Deno.env.get("PRIMER_API_KEY") === "mock-primer-key";
const COINBASE_MOCK_MODE = !Deno.env.get("COINBASE_COMMERCE_API_KEY") || Deno.env.get("COINBASE_COMMERCE_API_KEY") === "mock-coinbase-key";
const SUPABASE_MOCK_MODE = !Deno.env.get("SUPABASE_URL") || Deno.env.get("SUPABASE_URL") === "https://mock-project.supabase.co";

// Enhanced demo mode - shows real API responses when possible
const ENHANCED_DEMO_MODE = true;

// Initialize Supabase client with service role key (or mock)
const supabase = SUPABASE_MOCK_MODE ? null : createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// Utility function to verify webhook signatures
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  provider: "primer" | "coinbase"
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  let expectedSignature: string;
  if (provider === "primer") {
    // Primer uses format: v1=<signature>
    expectedSignature = signature.replace("v1=", "");
  } else {
    // Coinbase Commerce uses raw signature
    expectedSignature = signature;
  }

  const signatureBuffer = new Uint8Array(
    expectedSignature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
  );

  return await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBuffer,
    encoder.encode(payload)
  );
}

// Route handlers
async function handlePrimerClientSession(request: Request): Promise<Response> {
  try {
    const { amount, currency = "USD", userId } = await request.json();

    // Mock response when Primer credentials are not available
    if (PRIMER_MOCK_MODE) {
      const mockClientToken = `mock_client_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return new Response(JSON.stringify({ 
        clientToken: mockClientToken,
        mock: true,
        message: "Using mock Primer response - set PRIMER_API_KEY environment variable for real integration"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(`https://api.${PRIMER_ENV === 'sandbox' ? 'sandbox.' : ''}primer.io/client-session`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PRIMER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amount,
        currency: currency,
        orderId: `order_${Date.now()}`,
        customerId: userId,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Primer API error: ${data.message || 'Unknown error'}`);
    }

    return new Response(JSON.stringify({ clientToken: data.clientToken }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

async function handlePrimerCreatePayment(request: Request): Promise<Response> {
  try {
    const { paymentMethodToken, amount, currency = "USD", userId } = await request.json();

    // Mock response when Primer credentials are not available
    if (PRIMER_MOCK_MODE) {
      const mockPaymentId = `mock_payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const mockData = {
        id: mockPaymentId,
        status: "AUTHORIZED",
        amount: amount,
        currency: currency,
        mock: true,
        message: "Using mock Primer payment response - set PRIMER_API_KEY environment variable for real integration"
      };

      // Store mock transaction in database
      const { error } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          provider: "primer",
          provider_ref: mockPaymentId,
          amount_cents: amount,
          currency: currency,
          status: "completed",
          raw: mockData,
        });

      if (error) {
        console.error("Database error:", error);
      }

      // Auto-activate subscription for mock payments
      const { error: subError } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("user_id", userId)
        .eq("status", "pending");

      if (subError) {
        console.error("Subscription update error:", subError);
      }

      return new Response(JSON.stringify(mockData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(`https://api.${PRIMER_ENV === 'sandbox' ? 'sandbox.' : ''}primer.io/payments`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PRIMER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amount,
        currency: currency,
        paymentMethodToken: paymentMethodToken,
        orderId: `order_${Date.now()}`,
        customerId: userId,
      }),
    });

    const data = await response.json();

    // Store transaction in database
    const { error } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        provider: "primer",
        provider_ref: data.id,
        amount_cents: amount,
        currency: currency,
        status: data.status === "AUTHORIZED" ? "completed" : "pending",
        raw: data,
      });

    if (error) {
      console.error("Database error:", error);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

async function handleCryptoCharge(request: Request): Promise<Response> {
  try {
    const { amount, currency = "USD", userId, plan = "premium" } = await request.json();

    // Mock response when Coinbase Commerce credentials are not available
    if (COINBASE_MOCK_MODE) {
      const mockChargeId = `mock_charge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const mockCode = `MOCK${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const mockData = {
        chargeId: mockChargeId,
        hostedUrl: `https://commerce.coinbase.com/charges/${mockCode}`,
        code: mockCode,
        mock: true,
        message: "Using mock Coinbase Commerce response - set COINBASE_COMMERCE_API_KEY environment variable for real integration"
      };

      // Store mock transaction in database (if not in mock mode)
      if (!SUPABASE_MOCK_MODE) {
        const { error } = await supabase
          .from("transactions")
          .insert({
            user_id: userId,
            provider: "coinbase",
            provider_ref: mockCode,
            amount_cents: amount,
            currency: currency,
            status: "pending",
            raw: mockData,
          });

        if (error) {
          console.error("Database error:", error);
        }
      } else {
        console.log("Mock database: Would store crypto transaction", { userId, amount, currency });
      }

      return new Response(JSON.stringify(mockData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.commerce.coinbase.com/charges", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${COINBASE_COMMERCE_API_KEY}`,
        "Content-Type": "application/json",
        "X-CC-Version": "2018-03-22",
      },
      body: JSON.stringify({
        name: `${plan} Subscription`,
        description: `Payment for ${plan} subscription`,
        pricing_type: "fixed_price",
        local_price: {
          amount: (amount / 100).toString(),
          currency: currency,
        },
        metadata: {
          user_id: userId,
          plan: plan,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Coinbase Commerce API error: ${data.error?.message || 'Unknown error'}`);
    }

    // Store pending transaction
    const { error } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        provider: "coinbase",
        provider_ref: data.data.code,
        amount_cents: amount,
        currency: currency,
        status: "pending",
        raw: data.data,
      });

    if (error) {
      console.error("Database error:", error);
    }

    return new Response(JSON.stringify({
      chargeId: data.data.id,
      hostedUrl: data.data.hosted_url,
      code: data.data.code,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

async function handlePrimerWebhook(request: Request): Promise<Response> {
  try {
    const payload = await request.text();
    const signature = request.headers.get("x-primer-signature");

    if (!signature || !await verifyWebhookSignature(payload, signature, PRIMER_WEBHOOK_SECRET, "primer")) {
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(payload);
    
    if (event.eventType === "PAYMENT_CAPTURED") {
      const payment = event.data;
      
      // Update transaction status
      const { error: txnError } = await supabase
        .from("transactions")
        .update({
          status: "completed",
          raw: payment,
        })
        .eq("provider_ref", payment.id);

      if (txnError) {
        console.error("Transaction update error:", txnError);
      }

      // Update subscription status
      const { data: transaction } = await supabase
        .from("transactions")
        .select("user_id")
        .eq("provider_ref", payment.id)
        .single();

      if (transaction) {
        const { error: subError } = await supabase
          .from("subscriptions")
          .update({
            status: "active",
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq("user_id", transaction.user_id)
          .eq("status", "pending");

        if (subError) {
          console.error("Subscription update error:", subError);
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Primer webhook error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

async function handleDemoActivateSubscription(request: Request): Promise<Response> {
  try {
    const { userId } = await request.json();

    if (SUPABASE_MOCK_MODE) {
      return new Response(JSON.stringify({
        success: true,
        mock: true,
        message: "Mock subscription activation - set SUPABASE_URL for real database integration"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create or update subscription in Supabase
    const { error: subError } = await supabase
      .from("subscriptions")
      .upsert({
        user_id: userId,
        plan: "premium",
        status: "active",
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (subError) {
      console.error("Subscription activation error:", subError);
      throw new Error(`Database error: ${subError.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      status: "active",
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      message: "Subscription activated successfully"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

async function handleCoinbaseWebhook(request: Request): Promise<Response> {
  try {
    const payload = await request.text();
    const signature = request.headers.get("X-CC-Webhook-Signature");

    if (!signature || !await verifyWebhookSignature(payload, signature, COINBASE_COMMERCE_WEBHOOK_SECRET, "coinbase")) {
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(payload);
    
    if (event.event.type === "charge:confirmed") {
      const charge = event.event.data;
      
      // Update transaction status
      const { error: txnError } = await supabase
        .from("transactions")
        .update({
          status: "completed",
          raw: charge,
        })
        .eq("provider_ref", charge.code);

      if (txnError) {
        console.error("Transaction update error:", txnError);
      }

      // Update subscription status
      const userId = charge.metadata?.user_id;
      if (userId) {
        const { error: subError } = await supabase
          .from("subscriptions")
          .update({
            status: "active",
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq("user_id", userId)
          .eq("status", "pending");

        if (subError) {
          console.error("Subscription update error:", subError);
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Coinbase webhook error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// Main request handler
async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Route requests
  switch (path) {
    case "/api/primer/client-session":
      return handlePrimerClientSession(request);
    
    case "/api/primer/create-payment":
      return handlePrimerCreatePayment(request);
    
    case "/api/crypto/charge":
      return handleCryptoCharge(request);
    
    case "/api/webhooks/primer":
      return handlePrimerWebhook(request);
    
    case "/api/webhooks/coinbase":
      return handleCoinbaseWebhook(request);
    
    case "/api/demo/activate-subscription":
      return handleDemoActivateSubscription(request);
    
    default:
      return new Response("Not Found", { status: 404 });
  }
}

// Start server
serve(handler);
