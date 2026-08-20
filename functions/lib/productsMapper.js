/**
 * functions/lib/productsMapper.js
 *
 * Satu tempat pemetaan antara kolom Supabase `products` dan field legacy
 * yang dipakai frontend (products.js, sales.js, dst — field lama peninggalan
 * Google Sheets: ID_Barang, Nama_Barang, dst). Dipakai bersama oleh
 * products/index.js (GET list, POST) dan products/[id].js (GET satu, PUT,
 * DELETE) supaya logic mapping tidak duplikat di beberapa tempat dan gampang
 * tidak sinkron kalau nanti ada field baru.
 */

/** Baris Supabase -> bentuk yang dikonsumsi frontend. */
export function mapProductRow(product) {
  return {
    ID_Barang: product.id,
    Nama_Barang: product.name,
    Barcode: product.barcode || "",
    Tipe_Komoditi: product.commodity_type || "",
    Stok_Awal: product.initial_stock ?? 0,
    Aktif: product.active !== false,

    // Field database baru tetap tersedia bila nanti diperlukan.
    legacy_id: product.legacy_id,
    current_stock: product.current_stock ?? 0,
    created_at: product.created_at,
    updated_at: product.updated_at,
  };
}

/**
 * Payload dari frontend (field legacy) -> kolom Supabase untuk insert/update.
 *
 * @param {object} payload - body request, field legacy (Nama_Barang, dst)
 * @param {{partial?: boolean}} options - partial=true untuk PUT (cuma field
 *   yang benar-benar dikirim yang dipetakan, field lain tidak disentuh sama
 *   sekali). partial=false/default untuk POST (field yang tidak dikirim
 *   diisi nilai default supaya row baru selalu lengkap).
 *
 * SENGAJA tidak pernah menyentuh current_stock di sini — itu cuma boleh
 * berubah lewat proses stok masuk/penjualan/adjustment (domain Inventory),
 * bukan lewat form edit info barang.
 */
export function mapProductPayload(payload, { partial = false } = {}) {
  const row = {};

  if (!partial || payload.Nama_Barang !== undefined) {
    row.name = String(payload.Nama_Barang || "").trim();
  }
  if (!partial || payload.Barcode !== undefined) {
    row.barcode = payload.Barcode ? String(payload.Barcode).trim() : null;
  }
  if (!partial || payload.Tipe_Komoditi !== undefined) {
    row.commodity_type = payload.Tipe_Komoditi ? String(payload.Tipe_Komoditi).trim() : null;
  }
  if (!partial || payload.Stok_Awal !== undefined) {
    row.initial_stock = Number(payload.Stok_Awal) || 0;
  }
  if (!partial || payload.Aktif !== undefined) {
    row.active = payload.Aktif !== false;
  }

  return row;
}
