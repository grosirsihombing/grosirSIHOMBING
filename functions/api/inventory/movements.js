/**
 * functions/api/inventory/movements.js
 * Route: GET /api/inventory/movements?search=&page=&limit=&ID_Barang=
 *
 * Feed gabungan Stok_Masuk (IN) & Stock_Adjustment (ADJUSTMENT), terbaru
 * dulu — cikal bakal Stock Movement lengkap di PRD section 43 (V1 cukup
 * IN/OUT/ADJUSTMENT; OUT sudah terlihat lewat modul Penjualan sendiri).
 */

import { mockRepository } from "../../repositories/mockRepository.js";
import { okList } from "../_respond.js";

const repo = mockRepository;

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const search = url.searchParams.get("search") || "";
  const page = url.searchParams.get("page") || "1";
  const limit = url.searchParams.get("limit") || "50";
  const ID_Barang = url.searchParams.get("ID_Barang") || "";

  const { data, pagination } = await repo.listInventoryMovements({ page, limit, search, ID_Barang });
  return okList(data, pagination);
}
