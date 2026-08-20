/**
 * functions/api/customers/index.js
 * Route: GET /api/customers?search=&page=&limit=
 *        POST /api/customers
 */

import { createSupabaseClient } from "../../lib/supabase.js";
import { mapCustomerRow, mapCustomerPayload } from "../../lib/customersMapper.js";
import { okList, ok, fail } from "../_respond.js";

export async function onRequestGet(context) {
  try {
    const supabase = createSupabaseClient(context.env);
    const url = new URL(context.request.url);
    const search = (url.searchParams.get("search") || "").trim();
    const page = Math.max(Number.parseInt(url.searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get("limit") || "50", 10), 1), 100);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("customers")
      .select("*", { count: "exact" })
      .order("name", { ascending: true })
      .range(from, to);

    if (search) {
      const escaped = search.replace(/[%_]/g, "\\$&");
      query = query.or(`name.ilike.%${escaped}%,phone.ilike.%${escaped}%,email.ilike.%${escaped}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("GET /api/customers error:", error);
      return fail("CUSTOMERS_QUERY_ERROR", error.message, 500);
    }

    const rows = (data || []).map(mapCustomerRow);
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return okList(rows, { page, limit, total, totalPages });
  } catch (error) {
    console.error("GET /api/customers exception:", error);
    return fail("CUSTOMERS_INTERNAL_ERROR", error.message || "Gagal memuat data customer.", 500);
  }
}

export async function onRequestPost(context) {
  try {
    const supabase = createSupabaseClient(context.env);
    let payload;
    try {
      payload = await context.request.json();
    } catch {
      return fail("INVALID_BODY", "Body request tidak valid.", 400);
    }

    const name = String(payload.Nama_Customer || "").trim();
    if (!name) {
      return fail("VALIDATION_ERROR", "Nama customer wajib diisi.", 400);
    }
    if (payload.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.Email)) {
      return fail("VALIDATION_ERROR", "Format email tidak valid.", 400);
    }

    const insertRow = mapCustomerPayload({ ...payload, Nama_Customer: name });

    const { data, error } = await supabase
      .from("customers")
      .insert(insertRow)
      .select()
      .single();

    if (error) {
      console.error("POST /api/customers error:", error);
      return fail("CUSTOMERS_INSERT_ERROR", error.message, 500);
    }

    return ok(mapCustomerRow(data));
  } catch (error) {
    console.error("POST /api/customers exception:", error);
    return fail("CUSTOMERS_INTERNAL_ERROR", error.message || "Gagal menyimpan customer.", 500);
  }
}
