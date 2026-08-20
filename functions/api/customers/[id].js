/**
 * functions/api/customers/[id].js
 * Route: GET /api/customers/:id
 *        PUT /api/customers/:id
 *        DELETE /api/customers/:id -> soft delete (active=false)
 */

import { createSupabaseClient } from "../../lib/supabase.js";
import { mapCustomerRow, mapCustomerPayload } from "../../lib/customersMapper.js";
import { ok, fail } from "../_respond.js";

export async function onRequestGet(context) {
  try {
    const supabase = createSupabaseClient(context.env);

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", context.params.id)
      .maybeSingle();

    if (error) {
      console.error("GET /api/customers/:id error:", error);
      return fail("CUSTOMERS_QUERY_ERROR", error.message, 500);
    }

    if (!data) {
      return fail("CUSTOMER_NOT_FOUND", "Customer tidak ditemukan.", 404);
    }

    return ok(mapCustomerRow(data));
  } catch (error) {
    console.error("GET /api/customers/:id exception:", error);
    return fail("FETCH_FAILED", "Gagal mengambil data customer.", 500);
  }
}

export async function onRequestPut(context) {
  try {
    const supabase = createSupabaseClient(context.env);
    let payload;
    try {
      payload = await context.request.json();
    } catch {
      return fail("INVALID_BODY", "Body request tidak valid.", 400);
    }

    const name = payload.Nama_Customer !== undefined ? String(payload.Nama_Customer).trim() : undefined;
    if (name === "") {
      return fail("VALIDATION_ERROR", "Nama customer wajib diisi.", 400);
    }
    if (payload.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.Email)) {
      return fail("VALIDATION_ERROR", "Format email tidak valid.", 400);
    }

    const updateRow = mapCustomerPayload(payload, { partial: true });
    if (Object.keys(updateRow).length === 0) {
      return fail("VALIDATION_ERROR", "Tidak ada field yang diubah.", 400);
    }

    updateRow.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("customers")
      .update(updateRow)
      .eq("id", context.params.id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("PUT /api/customers/:id error:", error);
      return fail("CUSTOMERS_UPDATE_ERROR", error.message, 500);
    }

    if (!data) {
      return fail("CUSTOMER_NOT_FOUND", "Customer tidak ditemukan.", 404);
    }

    return ok(mapCustomerRow(data));
  } catch (error) {
    console.error("PUT /api/customers/:id exception:", error);
    return fail("UPDATE_FAILED", "Gagal memperbarui customer.", 500);
  }
}

export async function onRequestDelete(context) {
  try {
    const supabase = createSupabaseClient(context.env);

    const { data, error } = await supabase
      .from("customers")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("id", context.params.id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("DELETE /api/customers/:id error:", error);
      return fail("CUSTOMERS_DELETE_ERROR", error.message, 500);
    }

    if (!data) {
      return fail("CUSTOMER_NOT_FOUND", "Customer tidak ditemukan.", 404);
    }

    return ok(mapCustomerRow(data));
  } catch (error) {
    console.error("DELETE /api/customers/:id exception:", error);
    return fail("DELETE_FAILED", "Gagal menonaktifkan customer.", 500);
  }
}
