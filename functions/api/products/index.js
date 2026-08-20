/**
 * functions/api/products/index.js
 * Route: GET /api/products   -> daftar barang (search, page, limit)
 *        POST /api/products  -> tambah barang baru
 *
 * MIGRASI SUPABASE (tahap PRODUCTS): baca/tulis langsung ke tabel
 * `products` di Supabase, mapping ke field legacy lewat
 * functions/lib/productsMapper.js supaya frontend (products.js) tidak
 * perlu diubah sama sekali.
 */

import { createSupabaseClient } from "../../lib/supabase.js";
import { mapProductRow, mapProductPayload } from "../../lib/productsMapper.js";
import { okList, ok, fail } from "../_respond.js";

export async function onRequestGet(context) {
  try {
    const supabase = createSupabaseClient(context.env);
    const url = new URL(context.request.url);

    const search = (url.searchParams.get("search") || "").trim();
    const page = Math.max(
      Number.parseInt(url.searchParams.get("page") || "1", 10),
      1
    );
    const limit = Math.min(
      Math.max(
        Number.parseInt(url.searchParams.get("limit") || "20", 10),
        1
      ),
      100
    );

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("products")
      .select("*", { count: "exact" })
      .order("name", { ascending: true })
      .range(from, to);

    if (search) {
      const escaped = search.replace(/[%_]/g, "\\$&");
      query = query.or(
        `name.ilike.%${escaped}%,barcode.ilike.%${escaped}%,legacy_id.ilike.%${escaped}%`
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("GET /api/products error:", error);
      return fail("PRODUCTS_QUERY_ERROR", error.message, 500);
    }

    const rows = (data || []).map(mapProductRow);
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return okList(rows, { page, limit, total, totalPages });
  } catch (error) {
    console.error("GET /api/products exception:", error);
    return fail(
      "PRODUCTS_INTERNAL_ERROR",
      error.message || "Gagal memuat data barang.",
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

    const name = String(payload.Nama_Barang || "").trim();
    if (!name) {
      return fail("VALIDATION_ERROR", "Nama barang wajib diisi.", 400);
    }

    const insertRow = mapProductPayload({ ...payload, Nama_Barang: name });
    // Barang baru belum punya histori stok masuk/penjualan/adjustment,
    // jadi current_stock mulai sama dengan initial_stock. Ini SATU-SATUNYA
    // tempat current_stock disentuh dari endpoint ini — PUT tidak pernah
    // mengubahnya (lihat mapProductPayload).
    insertRow.current_stock = insertRow.initial_stock;

    const { data, error } = await supabase
      .from("products")
      .insert(insertRow)
      .select()
      .single();

    if (error) {
      console.error("POST /api/products error:", error);
      return fail("PRODUCTS_INSERT_ERROR", error.message, 500);
    }

    return ok(mapProductRow(data));
  } catch (error) {
    console.error("POST /api/products exception:", error);
    return fail(
      "PRODUCTS_INTERNAL_ERROR",
      error.message || "Gagal menyimpan barang.",
      500
    );
  }
}
