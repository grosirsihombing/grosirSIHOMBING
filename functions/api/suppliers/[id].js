/**
 * functions/api/suppliers/[id].js
 * Route: GET /api/suppliers/:id
 *        PUT /api/suppliers/:id
 *        DELETE /api/suppliers/:id -> soft delete (active=false)
 */

import { createSupabaseClient } from "../../lib/supabase.js";
import { mapSupplierRow, mapSupplierPayload } from "../../lib/suppliersMapper.js";
import { ok, fail } from "../_respond.js";

export async function onRequestGet(context) {
  try {
    const supabase = createSupabaseClient(context.env);

    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", context.params.id)
      .maybeSingle();

    if (error) {
      console.error("GET /api/suppliers/:id error:", error);
      return fail("SUPPLIERS_QUERY_ERROR", error.message, 500);
    }

    if (!data) {
      return fail("SUPPLIER_NOT_FOUND", "Supplier tidak ditemukan.", 404);
    }

    return ok(mapSupplierRow(data));
  } catch (error) {
    console.error("GET /api/suppliers/:id exception:", error);
    return fail("FETCH_FAILED", "Gagal mengambil data supplier.", 500);
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

    const name = payload.Nama_Supplier !== undefined ? String(payload.Nama_Supplier).trim() : undefined;
    if (name === "") {
      return fail("VALIDATION_ERROR", "Nama supplier wajib diisi.", 400);
    }
    if (payload.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.Email)) {
      return fail("VALIDATION_ERROR", "Format email tidak valid.", 400);
    }

    const updateRow = mapSupplierPayload(payload, { partial: true });
    if (Object.keys(updateRow).length === 0) {
      return fail("VALIDATION_ERROR", "Tidak ada field yang diubah.", 400);
    }

    updateRow.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("suppliers")
      .update(updateRow)
      .eq("id", context.params.id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("PUT /api/suppliers/:id error:", error);
      return fail("SUPPLIERS_UPDATE_ERROR", error.message, 500);
    }

    if (!data) {
      return fail("SUPPLIER_NOT_FOUND", "Supplier tidak ditemukan.", 404);
    }

    return ok(mapSupplierRow(data));
  } catch (error) {
    console.error("PUT /api/suppliers/:id exception:", error);
    return fail("UPDATE_FAILED", "Gagal memperbarui supplier.", 500);
  }
}

export async function onRequestDelete(context) {
  try {
    const supabase = createSupabaseClient(context.env);

    const { data, error } = await supabase
      .from("suppliers")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("id", context.params.id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("DELETE /api/suppliers/:id error:", error);
      return fail("SUPPLIERS_DELETE_ERROR", error.message, 500);
    }

    if (!data) {
      return fail("SUPPLIER_NOT_FOUND", "Supplier tidak ditemukan.", 404);
    }

    return ok(mapSupplierRow(data));
  } catch (error) {
    console.error("DELETE /api/suppliers/:id exception:", error);
    return fail("DELETE_FAILED", "Gagal menonaktifkan supplier.", 500);
  }
}
