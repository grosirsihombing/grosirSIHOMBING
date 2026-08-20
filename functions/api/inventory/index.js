/**
 * functions/api/inventory/index.js
 * Route: GET /api/inventory?search=&page=&limit=
 *
 * Mengembalikan Stok Saat Ini per barang beserta rincian sumbernya.
 */

import { createSupabaseClient } from "../../lib/supabase.js";
import { okList, fail } from "../_respond.js";

export async function onRequestGet(context) {
  try {
    const supabase = createSupabaseClient(context.env);
    const url = new URL(context.request.url);
    const search = (url.searchParams.get("search") || "").trim();
    const page = Math.max(Number.parseInt(url.searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get("limit") || "50", 10), 1), 100);

    // Dapatkan semua barang terlepas dari aktif/tidak untuk inventory
    let query = supabase
      .from("products")
      .select("id, name, active, initial_stock, current_stock");

    if (search) {
      const escaped = search.replace(/[%_]/g, "\\$&");
      query = query.or(`name.ilike.%${escaped}%,barcode.ilike.%${escaped}%`);
    }

    const { data: productsData, error: productsError } = await query;
    if (productsError) {
      return fail("INVENTORY_QUERY_ERROR", productsError.message, 500);
    }

    // Hitung rincian pergerakan stok: total stock masuk, total penjualan, total adjustments
    // Untuk efisiensi, lakukan queries agregasi di database
    const { data: stockInData, error: inError } = await supabase
      .from("stock_in")
      .select("product_id, quantity");
    
    const { data: adjustmentsData, error: adjError } = await supabase
      .from("stock_adjustments")
      .select("product_id, quantity");

    const { data: salesData, error: salesError } = await supabase
      .from("sale_items")
      .select("product_id, quantity");

    if (inError || adjError || salesError) {
      return fail("AGGREGATION_ERROR", "Gagal memproses agregasi data stok.", 500);
    }

    const inMap = new Map();
    (stockInData || []).forEach(row => {
      inMap.set(row.product_id, (inMap.get(row.product_id) || 0) + Number(row.quantity));
    });

    const adjMap = new Map();
    (adjustmentsData || []).forEach(row => {
      adjMap.set(row.product_id, (adjMap.get(row.product_id) || 0) + Number(row.quantity));
    });

    const saleMap = new Map();
    (salesData || []).forEach(row => {
      saleMap.set(row.product_id, (saleMap.get(row.product_id) || 0) + Number(row.quantity));
    });

    const enriched = (productsData || []).map(p => {
      const totalIn = inMap.get(p.id) || 0;
      const totalOut = saleMap.get(p.id) || 0;
      const totalAdj = adjMap.get(p.id) || 0;
      
      // Hitung stok aktual sesuai formula
      const calculatedStock = p.initial_stock + totalIn - totalOut + totalAdj;

      return {
        ID_Barang: p.id,
        Nama_Barang: p.name,
        Aktif: p.active !== false,
        Stok_Awal: p.initial_stock,
        Total_Stok_Masuk: totalIn,
        Total_Penjualan: totalOut,
        Total_Adjustment: totalAdj,
        Stok_Saat_Ini: calculatedStock,
      };
    });

    // Urutkan stok paling rendah dahulu
    enriched.sort((a, b) => a.Stok_Saat_Ini - b.Stok_Saat_Ini);

    const total = enriched.length;
    const start = (page - 1) * limit;
    const paginatedData = enriched.slice(start, start + limit);
    const totalPages = Math.ceil(total / limit);

    return okList(paginatedData, { page, limit, total, totalPages });
  } catch (error) {
    console.error("GET /api/inventory exception:", error);
    return fail("INVENTORY_INTERNAL_ERROR", error.message || "Gagal memuat data stok.", 500);
  }
}
