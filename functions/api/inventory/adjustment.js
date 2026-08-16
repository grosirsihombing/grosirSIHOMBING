/**
 * functions/api/inventory/adjustment.js
 * Route: POST /api/inventory/adjustment   (PRD section 39-40, 48)
 *
 * Menerima:
 * {
 *   ID_Barang: "BRG-001",
 *   Qty_Penyesuaian: -1,   // negatif = barang rusak/hilang, positif = stok fisik lebih banyak
 *   Alasan: "Barang rusak",
 *   Tanggal?: "2026-08-10"
 * }
 *
 * Alasan wajib diisi (section 40). Penyesuaian yang membuat Stok Saat Ini
 * negatif ditolak — histori tetap harus bisa ditelusuri (section 42).
 */

import {
  googleSheetsRepository,
  RepoError,
} from "../../repositories/googleSheetsRepository.js";

import { ok, fail, failFromRepoError } from "../_respond.js";

const repo = googleSheetsRepository;

export async function onRequestPost(context) {
  let body;
  try {
    body = await context.request.json();
  } catch {
    return fail("INVALID_BODY", "Body request tidak valid.", 400);
  }
  try {
    const row = await repo.createStockAdjustment(body);
    return ok(row);
  } catch (err) {
    if (err instanceof RepoError) return failFromRepoError(err);
    return fail("CREATE_FAILED", "Gagal menyimpan penyesuaian stok.", 500);
  }
}
