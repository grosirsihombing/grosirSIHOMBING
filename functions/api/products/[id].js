/**
 * functions/api/products/[id].js
 * Route:
 * GET    /api/products/:id
 * PUT    /api/products/:id
 * DELETE /api/products/:id -> soft delete (active=false)
 *
 * MIGRASI SUPABASE (tahap PRODUCTS): sekarang baca/tulis langsung ke
 * Supabase (products), konsisten dengan functions/api/products/index.js
 * yang sudah dimigrasikan lebih dulu. Kontrak response & field legacy untuk
 * frontend (products.js) TIDAK berubah sama sekali — :id yang dipakai di
 * sini adalah `id` (UUID) Supabase, sama seperti ID_Barang yang dikirim
 * balik ke frontend oleh mapProductRow().
 *
 * googleSheetsRepository TIDAK dihapus — masih dipakai endpoint lain
 * (prices, customers, suppliers, sales, inventory, dashboard) yang belum
 * dimigrasikan.
 */

import { createSupabaseClient } from "../../lib/supabase.js";
import { mapProductRow, mapProductPayload } from "../../lib/productsMapper.js";
import { ok, fail } from "../_respond.js";

export async function onRequestGet(context) {
  try {
    const supabase = createSupabaseClient(context.env);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", context.params.id)
      .maybeSingle();

    if (error) {
      console.error("GET /api/products/:id error:", error);
      return fail("PRODUCTS_QUERY_ERROR", error.message, 500);
    }

    if (!data) {
      return fail("PRODUCT_NOT_FOUND", "Barang tidak ditemukan.", 404);
    }

    return ok(mapProductRow(data));
  } catch (error) {
    console.error("GET /api/products/:id exception:", error);
    return fail("FETCH_FAILED", "Gagal mengambil data barang.", 500);
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

    const updateRow = mapProductPayload(payload, { partial: true });

    if (Object.keys(updateRow).length === 0) {
      return fail("VALIDATION_ERROR", "Tidak ada field yang diubah.", 400);
    }

    updateRow.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("products")
      .update(updateRow)
      .eq("id", context.params.id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("PUT /api/products/:id error:", error);
      return fail("PRODUCTS_UPDATE_ERROR", error.message, 500);
    }

    if (!data) {
      return fail("PRODUCT_NOT_FOUND", "Barang tidak ditemukan.", 404);
    }

    return ok(mapProductRow(data));
  } catch (error) {
    console.error("PUT /api/products/:id exception:", error);
    return fail("UPDATE_FAILED", "Gagal memperbarui barang.", 500);
  }
}

export async function onRequestDelete(context) {
  try {
    const supabase = createSupabaseClient(context.env);

    const { data, error } = await supabase
      .from("products")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("id", context.params.id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("DELETE /api/products/:id error:", error);
      return fail("PRODUCTS_DELETE_ERROR", error.message, 500);
    }

    if (!data) {
      return fail("PRODUCT_NOT_FOUND", "Barang tidak ditemukan.", 404);
    }

    return ok(mapProductRow(data));
  } catch (error) {
    console.error("DELETE /api/products/:id exception:", error);
    return fail("DELETE_FAILED", "Gagal menonaktifkan barang.", 500);
  }
}
