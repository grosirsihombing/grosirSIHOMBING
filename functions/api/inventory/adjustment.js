/**
 * functions/api/inventory/adjustment.js
 * Route: POST /api/inventory/adjustment
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
    const qty = Number(payload.Qty_Penyesuaian);
    const reason = payload.Alasan ? String(payload.Alasan).trim() : "";

    if (!productId) {
      return fail("VALIDATION_ERROR", "Barang harus dipilih.", 400);
    }

    if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty === 0) {
      return fail("VALIDATION_ERROR", "Qty penyesuaian harus bilangan bulat dan tidak boleh 0.", 400);
    }

    if (!reason) {
      return fail("VALIDATION_ERROR", "Alasan penyesuaian wajib diisi.", 400);
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

    // Cek agar tidak negatif setelah adjustment
    const nextStock = (product.current_stock || 0) + qty;
    if (nextStock < 0) {
      return fail("VALIDATION_ERROR", `Penyesuaian ini membuat stok ${product.name} menjadi negatif (${nextStock}).`, 400);
    }

    const today = new Date().toISOString().slice(0, 10);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(payload.Tanggal || "") ? payload.Tanggal : today;

    // Catat adjustment
    const { data: adjRow, error: adjErr } = await supabase
      .from("stock_adjustments")
      .insert({
        product_id: productId,
        quantity: qty,
        reason: reason,
        date: date,
      })
      .select()
      .single();

    if (adjErr) {
      console.error("POST /api/inventory/adjustment error:", adjErr);
      return fail("STOCK_ADJUSTMENT_ERROR", adjErr.message, 500);
    }

    // Update current_stock secara atomik di products
    const { error: upErr } = await supabase
      .from("products")
      .update({ current_stock: nextStock, updated_at: new Date().toISOString() })
      .eq("id", productId);

    if (upErr) {
      console.error("UPDATE products stock error:", upErr);
      return fail("STOCK_UPDATE_ERROR", upErr.message, 500);
    }

    return ok({
      ID_Adjustment: adjRow.id,
      Tanggal: adjRow.date,
      ID_Barang: productId,
      Nama_Barang: product.name,
      Qty_Penyesuaian: qty,
      Alasan: reason,
      Stok_Saat_Ini: nextStock,
    });
  } catch (error) {
    console.error("POST /api/inventory/adjustment exception:", error);
    return fail("STOCK_ADJ_INTERNAL_ERROR", error.message || "Gagal menyimpan penyesuaian stok.", 500);
  }
}
