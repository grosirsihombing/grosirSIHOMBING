/**
 * functions/api/sales/index.js
 * Route: GET /api/sales?search=&page=&limit=
 *        POST /api/sales
 */

import { createSupabaseClient } from "../../lib/supabase.js";
import { okList, ok, fail } from "../_respond.js";

export async function onRequestGet(context) {
  try {
    const supabase = createSupabaseClient(context.env);
    const url = new URL(context.request.url);
    const search = (url.searchParams.get("search") || "").trim();
    const page = Math.max(Number.parseInt(url.searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get("limit") || "50", 10), 1), 100);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // sales tidak menyimpan customer_id secara langsung (melainkan customer_category di schema Supabase).
    // Tapi tunggu, listSales di frontend membutuhkan Nama_Customer yang sesuai.
    // Karena sales Supabase tidak memiliki relational customer_id (sesuai OpenAPI properties),
    // kita perlu mencari nama customer dari legacy_id atau memetakan field notes/metadata.
    // Tunggu! Di mockRepository.js, sales menyimpan ID_Customer. Tapi di Supabase schema actual kita,
    // table sales hanya memiliki columns: ['id', 'legacy_id', 'date', 'customer_category', 'total', 'payment_status', 'payment_method', 'notes', 'active', 'created_at', 'updated_at'].
    // legacy_id di table sales dapat digunakan untuk menyimpan ID_Customer (CUST-xxx) agar bisa lookup customer!
    // Mari kita cek properti legacy_id. Di mock, ID_Customer disimpan di database.
    // Jika kita letakkan ID_Customer di legacy_id sales Supabase, kita bisa mengambil datanya.
    
    let query = supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    const { data: salesList, error: salesErr, count } = await query;
    if (salesErr) {
      return fail("SALES_QUERY_ERROR", salesErr.message, 500);
    }

    // Ambil list customers untuk lookup Nama_Customer berdasarkan legacy_id (ID_Customer)
    const { data: customersList, error: custErr } = await supabase
      .from("customers")
      .select("id, name");

    const custMap = new Map();
    (customersList || []).forEach(c => {
      custMap.set(c.id, c.name);
    });

    const mappedRows = (salesList || []).map(s => {
      // s.legacy_id menyimpan ID_Customer (UUID)
      const customerName = custMap.get(s.legacy_id) || "-";
      return {
        ID_Trx: s.id,
        Tanggal: s.date ? s.date.slice(0, 10) : "",
        ID_Customer: s.legacy_id || "",
        Nama_Customer: customerName,
        Total: s.total,
        Status_Bayar: s.payment_status === "lunas" ? "Lunas" : s.payment_status === "sebagian" ? "Sebagian" : "Belum Lunas",
        Metode_Bayar: s.payment_method,
        Catatan: s.notes || "",
        Aktif: s.active !== false,
        Created_At: s.created_at,
        Updated_At: s.updated_at
      };
    });

    let filtered = mappedRows;
    if (search) {
      const needle = search.toLowerCase();
      filtered = mappedRows.filter(r =>
        r.ID_Trx.toLowerCase().includes(needle) ||
        r.Nama_Customer.toLowerCase().includes(needle)
      );
    }

    const total = count || filtered.length;
    const totalPages = Math.ceil(total / limit);

    return okList(filtered, { page, limit, total, totalPages });
  } catch (error) {
    console.error("GET /api/sales exception:", error);
    return fail("SALES_INTERNAL_ERROR", error.message || "Gagal memuat transaksi penjualan.", 500);
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

    const customerId = payload.ID_Customer;
    const kategori = String(payload.Kategori_Pelanggan || "").trim();
    const rawItems = Array.isArray(payload.Items) ? payload.Items : [];
    const status = payload.Status_Bayar || "Lunas";
    const metode = payload.Metode_Bayar || "Cash";

    if (!customerId) return fail("VALIDATION_ERROR", "Customer tidak valid.", 400);
    if (!kategori) return fail("VALIDATION_ERROR", "Kategori pelanggan untuk transaksi wajib diisi.", 400);
    if (rawItems.length === 0) return fail("VALIDATION_ERROR", "Transaksi harus memiliki minimal 1 barang.", 400);

    // Ambil detail customer
    const { data: customer, error: cErr } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .maybeSingle();

    if (cErr || !customer) return fail("VALIDATION_ERROR", "Customer tidak valid.", 400);
    if (!customer.active) return fail("VALIDATION_ERROR", "Customer tidak aktif.", 400);

    // Validasi all items dan hitung subtotal & total
    const resolvedItems = [];
    let calculatedTotal = 0;

    for (const item of rawItems) {
      const { data: product, error: pErr } = await supabase
        .from("products")
        .select("*")
        .eq("id", item.ID_Barang)
        .maybeSingle();

      if (pErr || !product) return fail("VALIDATION_ERROR", "Barang tidak valid.", 400);
      if (!product.active) {
        return fail("VALIDATION_ERROR", `${product.name} sudah nonaktif dan tidak bisa dijual.`, 400);
      }

      const qty = Number(item.Qty);
      if (!Number.isFinite(qty) || qty <= 0) {
        return fail("VALIDATION_ERROR", `Qty untuk ${product.name} harus lebih dari 0.`, 400);
      }

      // Calculate stock dynamically to ensure consistency with inventory movements
      const { data: stockInRows } = await supabase.from("stock_in").select("quantity").eq("product_id", product.id);
      const { data: adjRows } = await supabase.from("stock_adjustments").select("quantity").eq("product_id", product.id);
      const { data: saleRows } = await supabase
        .from("sale_items")
        .select("quantity, sales!inner(active)")
        .eq("product_id", product.id)
        .eq("sales.active", true);

      const totalIn = (stockInRows || []).reduce((sum, r) => sum + Number(r.quantity), 0);
      const totalAdj = (adjRows || []).reduce((sum, r) => sum + Number(r.quantity), 0);
      const totalOut = (saleRows || []).reduce((sum, r) => sum + Number(r.quantity), 0);
      const calculatedStock = (product.initial_stock || 0) + totalIn + totalAdj - totalOut;

      if (calculatedStock < qty) {
        return fail("INSUFFICIENT_STOCK", `Stok ${product.name} tidak cukup (tersisa ${calculatedStock}).`, 400);
      }

      // Map kategori dari UI ke DB format
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
      const dbKategori = categoryMapToDb[kategori] || kategori.toLowerCase();

      // Ambil default price
      const { data: priceRow, error: prErr } = await supabase
        .from("product_prices")
        .select("*")
        .eq("product_id", product.id)
        .eq("customer_category", dbKategori)
        .eq("active", true)
        .maybeSingle();

      if (prErr || !priceRow) {
        return fail("PRICE_NOT_FOUND", `Harga ${product.name} untuk kategori ${kategori} belum diatur.`, 400);
      }

      let hargaSatuan = priceRow.default_price;
      if (item.Harga_Satuan !== undefined && item.Harga_Satuan !== null && item.Harga_Satuan !== "") {
        const overrideVal = Number(item.Harga_Satuan);
        if (isNaN(overrideVal) || overrideVal < 0) {
          return fail("VALIDATION_ERROR", `Harga manual untuk ${product.name} tidak valid.`, 400);
        }
        // Validasi apakah boleh edit harga
        if (!priceRow.allow_price_edit) {
          return fail("VALIDATION_ERROR", `Harga default ${product.name} tidak boleh di-override.`, 400);
        }
        hargaSatuan = overrideVal;
      }

      const subtotal = qty * hargaSatuan;
      calculatedTotal += subtotal;

      resolvedItems.push({
        product_id: product.id,
        name: product.name,
        quantity: qty,
        unit_price: hargaSatuan,
        subtotal: subtotal
      });
    }

    // Call Supabase RPC create_sale_atomic
    const rpcParams = {
      p_customer_category: kategori.toLowerCase(),
      p_payment_status: status.toLowerCase(),
      p_payment_method: metode,
      p_notes: payload.Catatan ? String(payload.Catatan).trim() : "",
      p_items: resolvedItems
    };

    const { data: rpcRes, error: rpcErr } = await supabase
      .rpc("create_sale", rpcParams);

    if (rpcErr) {
      console.error("RPC create_sale error:", rpcErr);
      return fail("CREATE_SALE_RPC_ERROR", rpcErr.message, 500);
    }

    // Update customer ID (legacy_id) di table sales karena RPC standard create_sale tidak menerima customer_id (melainkan name)
    // Mari update sales.legacy_id = customerId
    const saleId = typeof rpcRes === "object" && rpcRes !== null ? (rpcRes.sale_id || rpcRes.id) : rpcRes;
    
    if (saleId) {
      await supabase
        .from("sales")
        .update({ legacy_id: customerId })
        .eq("id", saleId);
    }

    const enrichedItems = resolvedItems.map(item => ({
      ID_Detail: saleId, 
      ID_Trx: saleId,
      ID_Barang: item.product_id,
      Nama_Barang: item.name,
      Kategori_Pelanggan: kategori,
      Qty: item.quantity,
      Harga_Satuan: item.unit_price,
      Subtotal: item.subtotal
    }));

    return ok({
      ID_Trx: saleId,
      Tanggal: new Date().toISOString().slice(0, 10),
      ID_Customer: customerId,
      Nama_Customer: customer.name,
      Total: calculatedTotal,
      Status_Bayar: status,
      Metode_Bayar: metode,
      Catatan: rpcParams.p_notes,
      Aktif: true,
      Items: enrichedItems
    });
  } catch (error) {
    console.error("POST /api/sales exception:", error);
    return fail("SALES_INTERNAL_ERROR", error.message || "Gagal menyimpan transaksi.", 500);
  }
}
