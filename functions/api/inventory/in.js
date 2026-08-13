/**
 * functions/api/inventory/in.js
 * Route: POST /api/inventory/in   (PRD section 28-30, 48)
 *
 * Menerima:
 * {
 *   ID_Barang: "BRG-001",
 *   Qty_Dus_Masuk: 10,
 *   ID_Supplier: "SUP-001",
 *   Harga_Beli?: 15000,
 *   Tanggal?: "2026-08-10",
 *   Catatan?: string
 * }
 *
 * Supplier wajib dipilih dari master Supplier (section 29). Harga_Beli
 * opsional, tersimpan sebagai histori transaksi (section 30).
 */

import { mockRepository, RepoError } from "../../repositories/mockRepository.js";
import { ok, fail, failFromRepoError } from "../_respond.js";

const repo = mockRepository;

export async function onRequestPost(context) {
  let body;
  try {
    body = await context.request.json();
  } catch {
    return fail("INVALID_BODY", "Body request tidak valid.", 400);
  }
  try {
    const row = await repo.createStockIn(body);
    return ok(row);
  } catch (err) {
    if (err instanceof RepoError) return failFromRepoError(err);
    return fail("CREATE_FAILED", "Gagal menyimpan stok masuk.", 500);
  }
}
