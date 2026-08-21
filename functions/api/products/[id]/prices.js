/**
 * functions/api/products/[id]/prices.js
 * Route: GET /api/products/:id/prices
 *        PUT /api/products/:id/prices
 */

import { createSupabaseClient } from "../../../lib/supabase.js";
import { ok, fail } from "../../_respond.js";

export async function onRequestGet(context) {
  try {
    const supabase = createSupabaseClient(context.env);
    
    // Cek apakah produk exist
    const { data: product, error: pErr } = await supabase
      .from("products")
      .select("id")
      .eq("id", context.params.id)
      .maybeSingle();

    if (pErr || !product) {
      return fail("PRODUCT_NOT_FOUND", "Barang tidak ditemukan.", 404);
    }

    const { data: rows, error: priceErr } = await supabase
      .from("product_prices")
      .select("*")
      .eq("product_id", context.params.id);

    if (priceErr) {
      return fail("PRICES_QUERY_ERROR", priceErr.message, 500);
    }

    // Map database snake_case categories to Frontend capitalized formats
    const categoryMapToFrontend = {
      "retail": "Retail",
      "sub_agen": "Sub Agen",
      "user": "User",
      "grosir": "Grosir"
    };

    // Map back to legacy field
    const mapped = (rows || []).map(r => ({
      ID_Harga: r.id,
      ID_Barang: r.product_id,
      Kategori_Pelanggan: categoryMapToFrontend[r.customer_category] || r.customer_category,
      Harga_Default: r.default_price,
      Boleh_Edit_Harga: r.allow_price_edit,
      Aktif: r.active !== false,
      updated_at: r.updated_at
    }));

    return ok(mapped);
  } catch (error) {
    console.error("GET prices exception:", error);
    return fail("FETCH_FAILED", "Gagal mengambil data harga.", 500);
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

    const productId = context.params.id;
    let kategoriInput = String(payload.Kategori_Pelanggan || "").trim();
    const harga = Number(payload.Harga_Default);

    if (!kategoriInput) {
      return fail("VALIDATION_ERROR", "Kategori_Pelanggan wajib diisi.", 400);
    }
    if (isNaN(harga) || harga < 0) {
      return fail("VALIDATION_ERROR", "Harga tidak boleh kurang dari 0.", 400);
    }

    // Map frontend capitalized categories to database snake_case formats
    const categoryMapToDb = {
      "Retail": "retail",
      "Sub Agen": "sub_agen",
      "User": "user",
      "Grosir": "grosir",
      "retail": "retail",
      "sub_agen": "sub_agen",
      "user": "user",
      "grosir": "grosir"
    };
    const kategori = categoryMapToDb[kategoriInput] || kategoriInput.toLowerCase();

    // Ambil harga existing
    const { data: match, error: matchErr } = await supabase
      .from("product_prices")
      .select("id")
      .eq("product_id", productId)
      .eq("customer_category", kategori)
      .maybeSingle();

    if (matchErr) {
      return fail("PRICES_QUERY_ERROR", matchErr.message, 500);
    }

    const priceRow = {
      product_id: productId,
      customer_category: kategori,
      default_price: harga,
      allow_price_edit: !!payload.Boleh_Edit_Harga,
      active: payload.Aktif !== false,
      updated_at: new Date().toISOString()
    };

    let result;
    if (match) {
      const { data, error } = await supabase
        .from("product_prices")
        .update(priceRow)
        .eq("id", match.id)
        .select()
        .single();
      if (error) return fail("PRICES_UPDATE_ERROR", error.message, 500);
      result = data;
    } else {
      const { data, error } = await supabase
        .from("product_prices")
        .insert(priceRow)
        .select()
        .single();
      if (error) return fail("PRICES_INSERT_ERROR", error.message, 500);
      result = data;
    }

    const categoryMapToFrontend = {
      "retail": "Retail",
      "sub_agen": "Sub Agen",
      "user": "User",
      "grosir": "Grosir"
    };

    return ok({
      ID_Harga: result.id,
      ID_Barang: result.product_id,
      Kategori_Pelanggan: categoryMapToFrontend[result.customer_category] || result.customer_category,
      Harga_Default: result.default_price,
      Boleh_Edit_Harga: result.allow_price_edit,
      Aktif: result.active !== false,
      updated_at: result.updated_at
    });
  } catch (error) {
    console.error("PUT prices exception:", error);
    return fail("UPDATE_FAILED", "Gagal menyimpan harga.", 500);
  }
}
