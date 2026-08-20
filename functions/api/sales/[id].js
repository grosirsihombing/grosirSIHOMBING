/**
 * functions/api/sales/[id].js
 * Route: GET /api/sales/:id
 *        PUT /api/sales/:id -> ubah status
 *        DELETE /api/sales/:id -> soft delete
 */

import { createSupabaseClient } from "../../lib/supabase.js";
import { ok, fail } from "../_respond.js";

export async function onRequestGet(context) {
  try {
    const supabase = createSupabaseClient(context.env);

    const { data: sale, error: saleErr } = await supabase
      .from("sales")
      .select("*")
      .eq("id", context.params.id)
      .maybeSingle();

    if (saleErr || !sale) {
      return fail("SALE_NOT_FOUND", "Transaksi tidak ditemukan.", 404);
    }

    // Ambil customer
    let customerName = "-";
    let customerId = "";
    if (sale.legacy_id) {
      const { data: customer } = await supabase
        .from("customers")
        .select("id, name")
        .eq("id", sale.legacy_id)
        .maybeSingle();
      if (customer) {
        customerName = customer.name;
        customerId = customer.id;
      }
    }

    // Ambil items
    const { data: items, error: itemsErr } = await supabase
      .from("sale_items")
      .select("id, quantity, unit_price, subtotal, products(id, name)")
      .eq("sale_id", context.params.id);

    if (itemsErr) {
      return fail("SALE_ITEMS_QUERY_ERROR", itemsErr.message, 500);
    }

    const mappedItems = (items || []).map(item => ({
      ID_Detail: item.id,
      ID_Trx: context.params.id,
      ID_Barang: item.products?.id || "",
      Nama_Barang: item.products?.name || "-",
      Qty: item.quantity,
      Harga_Satuan: item.unit_price,
      Subtotal: item.subtotal
    }));

    return ok({
      ID_Trx: sale.id,
      Tanggal: sale.date ? sale.date.slice(0, 10) : "",
      ID_Customer: customerId,
      Nama_Customer: customerName,
      Total: sale.total,
      Status_Bayar: sale.payment_status === "lunas" ? "Lunas" : sale.payment_status === "sebagian" ? "Sebagian" : "Belum Lunas",
      Metode_Bayar: sale.payment_method,
      Catatan: sale.notes || "",
      Aktif: sale.active !== false,
      Items: mappedItems
    });
  } catch (error) {
    console.error("GET sale/:id exception:", error);
    return fail("FETCH_FAILED", "Gagal mengambil data transaksi.", 500);
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

    const updateRow = {};
    if (payload.Aktif !== undefined) {
      updateRow.active = !!payload.Aktif;
    }
    if (payload.Status_Bayar !== undefined) {
      updateRow.payment_status = String(payload.Status_Bayar).toLowerCase();
    }

    updateRow.updated_at = new Date().toISOString();

    const { data: sale, error } = await supabase
      .from("sales")
      .update(updateRow)
      .eq("id", context.params.id)
      .select()
      .maybeSingle();

    if (error || !sale) {
      return fail("SALE_NOT_FOUND", "Transaksi tidak ditemukan.", 404);
    }

    // Kembalikan objek data lengkap
    return onRequestGet(context);
  } catch (error) {
    console.error("PUT sale/:id exception:", error);
    return fail("UPDATE_FAILED", "Gagal memperbarui status transaksi.", 500);
  }
}

export async function onRequestDelete(context) {
  try {
    const supabase = createSupabaseClient(context.env);

    // Dapatkan details penjualan terlebih dahulu untuk restore stock (karena dibatalkan/soft delete)
    const { data: items } = await supabase
      .from("sale_items")
      .select("product_id, quantity")
      .eq("sale_id", context.params.id);

    // Batalkan transaksi
    const { data: sale, error } = await supabase
      .from("sales")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("id", context.params.id)
      .select()
      .maybeSingle();

    if (error || !sale) {
      return fail("SALE_NOT_FOUND", "Transaksi tidak ditemukan.", 404);
    }

    // Kembalikan stok ke products karena transaksi dibatalkan
    if (items && items.length > 0) {
      for (const item of items) {
        // Ambil stock saat ini
        const { data: product } = await supabase
          .from("products")
          .select("current_stock")
          .eq("id", item.product_id)
          .maybeSingle();

        if (product) {
          const restoredStock = (product.current_stock || 0) + Number(item.quantity);
          await supabase
            .from("products")
            .update({ current_stock: restoredStock, updated_at: new Date().toISOString() })
            .eq("id", item.product_id);
        }
      }
    }

    return onRequestGet(context);
  } catch (error) {
    console.error("DELETE sale/:id exception:", error);
    return fail("DELETE_FAILED", "Gagal membatalkan transaksi.", 500);
  }
}
