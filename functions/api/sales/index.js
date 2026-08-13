/**
 * functions/api/sales/index.js
 * Route: GET /api/sales?search=&page=&limit=   (PRD section 46-47)
 *        POST /api/sales                       (PRD section 34-36, 48)
 *
 * POST menerima:
 * {
 *   ID_Customer: "CUST-001",
 *   Items: [{ ID_Barang: "BRG-004", Qty: 1, Harga_Satuan?: 17000 }],
 *   Status_Bayar: "Lunas" | "Belum Lunas" | "Sebagian",
 *   Metode_Bayar: "Cash" | "Transfer" | "QRIS" | "Lainnya",
 *   Catatan?: string
 * }
 *
 * Harga_Satuan pada item bersifat opsional — kirim hanya jika kasir
 * mengubah harga manual (dan itu pun hanya diizinkan bila Boleh_Edit_Harga
 * true untuk barang tsb, PRD section 17). Jika tidak dikirim, backend
 * memakai Harga_Default sesuai kategori pelanggan.
 */

import { mockRepository, RepoError } from "../../repositories/mockRepository.js";
import { okList, ok, fail, failFromRepoError } from "../_respond.js";

const repo = mockRepository;

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const search = url.searchParams.get("search") || "";
  const page = url.searchParams.get("page") || "1";
  const limit = url.searchParams.get("limit") || "50";

  const { data, pagination } = await repo.listSales({ page, limit, search });
  return okList(data, pagination);
}

export async function onRequestPost(context) {
  let body;
  try {
    body = await context.request.json();
  } catch {
    return fail("INVALID_BODY", "Body request tidak valid.", 400);
  }
  try {
    const row = await repo.createSale(body);
    return ok(row);
  } catch (err) {
    if (err instanceof RepoError) return failFromRepoError(err);
    return fail("CREATE_FAILED", "Gagal menyimpan transaksi.", 500);
  }
}
