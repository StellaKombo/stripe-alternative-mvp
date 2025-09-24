import { Router } from "https://deno.land/x/oak/mod.ts";
import { supabase } from "./supabaseClient.ts"; // your Supabase client

const router = new Router();

/**
 * POST /merchants
 * Onboard a new merchant (basic info)
 */
router.post("/merchants", async (ctx) => {
  const body = await ctx.request.body({ type: "json" }).value;
  const userId = ctx.state.user.id; // assume auth middleware sets this

  const { name, business_type, country, website } = body;

  const { data, error } = await supabase
    .from("merchants")
    .insert([{ user_id: userId, name, business_type, country, website }])
    .select()
    .single();

  if (error) {
    ctx.response.status = 400;
    ctx.response.body = { error: error.message };
    return;
  }

  // Log audit event
  await supabase.from("audit_logs").insert([{
    entity_type: "merchant",
    entity_id: data.id,
    action: "created",
    payload: body,
    actor: userId,
  }]);

  ctx.response.status = 201;
  ctx.response.body = data;
});

/**
 * POST /merchants/:id/documents
 * Upload a merchant document
 */
router.post("/merchants/:id/documents", async (ctx) => {
  const { id } = ctx.params;
  const body = await ctx.request.body({ type: "json" }).value;
  const userId = ctx.state.user.id;

  const { doc_type, storage_path } = body;

  // Check ownership
  const { data: merchant, error: merchantErr } = await supabase
    .from("merchants")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (merchantErr || merchant.user_id !== userId) {
    ctx.response.status = 403;
    ctx.response.body = { error: "Unauthorized" };
    return;
  }

  const { data, error } = await supabase
    .from("merchant_documents")
    .insert([{ merchant_id: id, doc_type, storage_path }])
    .select()
    .single();

  if (error) {
    ctx.response.status = 400;
    ctx.response.body = { error: error.message };
    return;
  }

  // Audit log
  await supabase.from("audit_logs").insert([{
    entity_type: "merchant_document",
    entity_id: data.id,
    action: "uploaded",
    payload: body,
    actor: userId,
  }]);

  ctx.response.status = 201;
  ctx.response.body = data;
});

/**
 * GET /risk/:merchant_id
 * Fetch merchant risk profile
 */
router.get("/risk/:merchant_id", async (ctx) => {
  const { merchant_id } = ctx.params;
  const userId = ctx.state.user.id;

  // Check ownership
  const { data: merchant, error: merchantErr } = await supabase
    .from("merchants")
    .select("id, user_id")
    .eq("id", merchant_id)
    .single();

  if (merchantErr || merchant.user_id !== userId) {
    ctx.response.status = 403;
    ctx.response.body = { error: "Unauthorized" };
    return;
  }

  const { data, error } = await supabase
    .from("risk_profiles")
    .select("*")
    .eq("merchant_id", merchant_id)
    .single();

  if (error) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Risk profile not found" };
    return;
  }

  ctx.response.status = 200;
  ctx.response.body = data;
});

/**
 * POST /audit
 * Optional: Create a custom audit log (admin/demo)
 */
router.post("/audit", async (ctx) => {
  const body = await ctx.request.body({ type: "json" }).value;
  const { entity_type, entity_id, action, payload } = body;
  const userId = ctx.state.user.id;

  const { data, error } = await supabase
    .from("audit_logs")
    .insert([{ entity_type, entity_id, action, payload, actor: userId }])
    .select()
    .single();

  if (error) {
    ctx.response.status = 400;
    ctx.response.body = { error: error.message };
    return;
  }

  ctx.response.status = 201;
  ctx.response.body = data;
});

export default router;
