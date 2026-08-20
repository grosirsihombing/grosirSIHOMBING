/**
 * functions/api/inventory/in.js
 * Route: POST /api/inventory/in
 */

import { createSupabaseClient } from "../../lib/supabase.js";
import { ok, fail } from "../_respond.js";

export async function onRequestPost(context) {
  try {
    const supabase = createSupabaseClient(context.env);
    let payload;
    try {
      payload = await context.request.json();
    } catch {
      return fail("INVALID_BODY", "Body request tidak valid.", 400);
    }

    const productId = payload.ID_Barang;
    const supplierId = payload.ID_Supplier;
    const qty = Number(payload.Qty_Dus_Masuk);

    if (!productId || !supplierId) {
      return fail("VALIDATION_ERROR", "Barang dan Supplier harus dipilih.", 400);
    }

    if (!Number.isFinite(qty) || qty <= 0) {
      return fail("VALIDATION_ERROR", "Qty stok masuk harus lebih dari 0.", 400);
    }

    // Ambil produk dan validasi aktif
    const { data: product, error: pErr } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .maybeSingle();

    if (pErr || !product) {
      return fail("VALIDATION_ERROR", "Barang tidak valid.", 400);
    }
    if (!product.active) {
      return fail("VALIDATION_ERROR", `${product.name} sudah nonaktif.`, 400);
    }

    // Ambil supplier dan validasi aktif
    const { data: supplier, error: sErr } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", supplierId)
      .maybeSingle();

    if (sErr || !supplier) {
      return fail("VALIDATION_ERROR", "Supplier tidak valid.", 400);
    }
    if (!supplier.active) {
      return fail("VALIDATION_ERROR", `${supplier.name} sudah nonaktif.`, 400);
    }

    let hargaBeli = null;
    if (payload.Harga_Beli !== undefined && payload.Harga_Beli !== null && payload.Harga_Beli !== "") {
      hargaBeli = Number(payload.Harga_Beli);
      if (isNaN(hargaBeli) || hargaBeli < 0) {
        return fail("VALIDATION_ERROR", "Harga beli tidak boleh kurang dari 0.", 400);
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(payload.Tanggal || "") ? payload.Tanggal : today;

    // Catat Stock In
    const { data: stockInRow, error: inErr } = await supabase
      .from("stock_in")
      .insert({
        product_id: productId,
        supplier_id: supplierId,
        quantity: qty,
        purchase_price: hargaBeli,
        date: date,
        notes: payload.Catatan ? String(payload.Catatan).trim() : "",
      })
      .select()
      .single();

    if (inErr) {
      console.error("POST /api/inventory/in error:", inErr);
      return fail("STOCK_IN_ERROR", inErr.message, 500);
    }

    // Update current_stock secara atomik di products
    const nextStock = (product.current_stock || 0) + qty;
    const { error: upErr } = await supabase
      .from("products")
      .update({ current_stock: nextStock, updated_at: new Date().toISOString() })
      .eq("id", productId);

    if (upErr) {
      console.error("UPDATE products stock error:", upErr);
      return fail("STOCK_UPDATE_ERROR", upErr.message, 500);
    }

    return ok({
      ID_Stok_Masuk: stockInRow.id,
      Tanggal: stockInRow.date,
      ID_Barang: productId,
      Nama_Barang: product.name,
      Qty_Dus_Masuk: qty,
      ID_Supplier: supplierId,
      Nama_Supplier: supplier.name,
      Harga_Beli: hargaBeli,
      Catatan: stockInRow.notes,
      Stok_Saat_Ini: nextStock,
    });
  } catch (error) {
    console.error("POST /api/inventory/in exception:", error);
    return fail("STOCK_IN_INTERNAL_ERROR", error.message || "Gagal menyimpan stok masuk.", 500);
  }
}
