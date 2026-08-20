/**
 * functions/api/inventory/movements.js
 * Route: GET /api/inventory/movements?search=&page=&limit=&ID_Barang=
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
    const productIdFilter = url.searchParams.get("ID_Barang") || "";

    // Ambil detail stock in
    let inQuery = supabase
      .from("stock_in")
      .select("id, date, quantity, purchase_price, notes, created_at, products(id, name), suppliers(id, name)");
    if (productIdFilter) {
      inQuery = inQuery.eq("product_id", productIdFilter);
    }
    const { data: stockIn, error: inErr } = await inQuery;

    // Ambil detail adjustments
    let adjQuery = supabase
      .from("stock_adjustments")
      .select("id, date, quantity, reason, created_at, products(id, name)");
    if (productIdFilter) {
      adjQuery = adjQuery.eq("product_id", productIdFilter);
    }
    const { data: stockAdj, error: adjErr } = await adjQuery;

    if (inErr || adjErr) {
      return fail("MOVEMENTS_QUERY_ERROR", (inErr || adjErr).message, 500);
    }

    const movements = [];

    (stockIn || []).forEach(m => {
      movements.push({
        ID: m.id,
        Type: "IN",
        Tanggal: m.date,
        ID_Barang: m.products?.id || "",
        Nama_Barang: m.products?.name || "-",
        Qty: m.quantity,
        Nama_Supplier: m.suppliers?.name || "-",
        Harga_Beli: m.purchase_price,
        Catatan: m.notes,
        Created_At: m.created_at,
      });
    });

    (stockAdj || []).forEach(a => {
      movements.push({
        ID: a.id,
        Type: "ADJUSTMENT",
        Tanggal: a.date,
        ID_Barang: a.products?.id || "",
        Nama_Barang: a.products?.name || "-",
        Qty: a.quantity,
        Alasan: a.reason,
        Created_At: a.created_at,
      });
    });

    // Urutkan pergerakan terbaru dahulu
    movements.sort((a, b) => new Date(b.Created_At) - new Date(a.Created_At));

    // Filter pencarian
    let filtered = movements;
    if (search) {
      const needle = search.toLowerCase();
      filtered = movements.filter(m =>
        m.Nama_Barang.toLowerCase().includes(needle) ||
        m.ID.toLowerCase().includes(needle)
      );
    }

    const total = filtered.length;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);
    const totalPages = Math.ceil(total / limit);

    return okList(paginated, { page, limit, total, totalPages });
  } catch (error) {
    console.error("GET /api/inventory/movements exception:", error);
    return fail("MOVEMENTS_INTERNAL_ERROR", error.message || "Gagal memuat pergerakan stok.", 500);
  }
}
