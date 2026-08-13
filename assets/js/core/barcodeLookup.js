/**
 * core/barcodeLookup.js
 *
 * Satu fungsi murni: query barcode ke backend lewat Api (bukan fetch
 * langsung — PRD section 4). Tidak menyentuh DOM/UI sama sekali; UI (kamera,
 * daftar duplikat, toast) ada di components/scanner.js yang memakai ini.
 *
 * GET /api/products?barcode=... EXACT match, beda dari ?search= yang
 * substring. Barcode sengaja tidak unique (PRD section 12), jadi hasilnya
 * bisa 0, 1, atau beberapa baris — kontrak 3 kondisi di PRD section 13.
 */

import Api from "./api.js";

export async function lookupProductsByBarcode(barcode) {
  const code = String(barcode || "").trim();
  if (!code) return [];
  const res = await Api.get("/products", { barcode: code, limit: 50 });
  return res.data;
}
