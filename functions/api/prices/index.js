/**
 * functions/api/prices/index.js
 * Route: GET  /api/prices?ID_Barang=<uuid>   -> daftar harga per kategori utk 1 barang
 *        POST /api/prices                    -> body TANPA ID_Harga = insert,
 *                                                 body DENGAN ID_Harga = update baris itu
 *
 * MIGRASI SUPABASE (tahap PRICES): baca/tulis langsung ke tabel
 * `product_prices`, mapping ke field legacy yang sudah dipakai
 * assets/js/modules/products.js — kontrak response TIDAK berubah.
 *
 * Schema product_prices (dikonfirmasi langsung dari Supabase, bukan tebakan):
 *   id, legacy_id, product_id, customer_category, default_price,
 *   allow_price_edit, active, updated_at
 *
 * legacy_id sengaja tidak pernah ditulis dari sini — biarkan default/trigger
 * di database yang menangani kalau ada, sesuai instruksi.
 */

import { createSupabaseClient } from "../../lib/supabase.js";
import { ok, fail } from "../_respond.js";

function mapPriceRow(row) {
  return {
    ID_Harga: row.id,
    ID_Barang: row.product_id,
    Kategori_Pelanggan: row.customer_category,
    Harga_Default: row.default_price,
    Boleh_Edit_Harga: row.allow_price_edit === true,
    Aktif: row.active !== false,
  };
}

export async function onRequestGet(context) {
  try {
    const supabase = createSupabaseClient(context.env);
    const url = new URL(context.request.url);
    const ID_Barang = url.searchParams.get("ID_Barang") || "";

    let query = supabase
      .from("product_prices")
      .select("*")
      .order("customer_category", { ascending: true });

    if (ID_Barang) {
      query = query.eq("product_id", ID_Barang);
    }

    const { data, error } = await query;

    if (error) {
      console.error("GET /api/prices error:", error);
      return fail("PRICES_QUERY_ERROR", error.message, 500);
    }

    return ok((data || []).map(mapPriceRow));
  } catch (error) {
    console.error("GET /api/prices exception:", error);
    return fail(
      "PRICES_INTERNAL_ERROR",
      error.message || "Gagal mengambil data harga.",
      500
    );
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

    // ----- UPDATE: body punya ID_Harga -> update baris itu, jangan insert -----
    if (payload.ID_Harga) {
      const updateRow = {};

      if (payload.ID_Barang !== undefined) updateRow.product_id = payload.ID_Barang;
      if (payload.Kategori_Pelanggan !== undefined) updateRow.customer_category = payload.Kategori_Pelanggan;
      if (payload.Harga_Default !== undefined) updateRow.default_price = Number(payload.Harga_Default) || 0;
      if (payload.Boleh_Edit_Harga !== undefined) updateRow.allow_price_edit = payload.Boleh_Edit_Harga === true;
      if (payload.Aktif !== undefined) updateRow.active = payload.Aktif !== false;

      if (Object.keys(updateRow).length === 0) {
        return fail("VALIDATION_ERROR", "Tidak ada field yang diubah.", 400);
      }

      updateRow.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("product_prices")
        .update(updateRow)
        .eq("id", payload.ID_Harga)
        .select()
        .maybeSingle();

      if (error) {
        console.error("POST /api/prices (update) error:", error);
        return fail("PRICES_UPDATE_ERROR", error.message, 500);
      }

      if (!data) {
        return fail("PRICE_NOT_FOUND", "Data harga tidak ditemukan.", 404);
      }

      return ok(mapPriceRow(data));
    }

    // ----- INSERT: body tanpa ID_Harga -----
    if (!payload.ID_Barang) {
      return fail("VALIDATION_ERROR", "ID_Barang wajib diisi.", 400);
    }
    if (!payload.Kategori_Pelanggan) {
      return fail("VALIDATION_ERROR", "Kategori_Pelanggan wajib diisi.", 400);
    }

    const insertRow = {
      product_id: payload.ID_Barang,
      customer_category: payload.Kategori_Pelanggan,
      default_price: Number(payload.Harga_Default) || 0,
      allow_price_edit: payload.Boleh_Edit_Harga === true,
      active: payload.Aktif !== false,
    };

    const { data, error } = await supabase
      .from("product_prices")
      .insert(insertRow)
      .select()
      .single();

    if (error) {
      console.error("POST /api/prices (insert) error:", error);
      return fail("PRICES_INSERT_ERROR", error.message, 500);
    }

    return ok(mapPriceRow(data));
  } catch (error) {
    console.error("POST /api/prices exception:", error);
    return fail(
      "PRICES_INTERNAL_ERROR",
      error.message || "Gagal menyimpan harga.",
      500
    );
  }
}
