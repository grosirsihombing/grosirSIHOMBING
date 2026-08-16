/**
 * functions/api/inventory/index.js
 * Route: GET /api/inventory?search=&page=&limit=   (PRD section 46-47)
 *
 * Mengembalikan Stok Saat Ini per barang beserta rincian sumbernya
 * (Stok_Awal, Total_Stok_Masuk, Total_Penjualan, Total_Adjustment) — PRD
 * section 26, 41. Diurutkan stok paling rendah dulu supaya gudang langsung
 * tahu barang mana yang perlu direstok.
 */

import { googleSheetsRepository } from "../../repositories/googleSheetsRepository.js";
import { okList } from "../_respond.js";

const repo = googleSheetsRepository;

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const search = url.searchParams.get("search") || "";
  const page = url.searchParams.get("page") || "1";
  const limit = url.searchParams.get("limit") || "50";

  const { data, pagination } = await repo.listInventory({ page, limit, search });
  return okList(data, pagination);
}
