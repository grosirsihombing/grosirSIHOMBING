/**
 * functions/api/products/[id]/prices.js
 * Route: GET /api/products/:id/prices   -> daftar harga per kategori utk 1 barang
 *        PUT /api/products/:id/prices   -> upsert satu baris harga (body: 1 kategori)
 *
 * Modul Harga dipisah dari Master Barang (PRD section 14), tapi selalu diakses
 * lewat konteks barangnya — sesuai alur UI di section 16-18 (pilih barang -> atur harga).
 */

import { mockRepository, RepoError } from "../../../repositories/mockRepository.js";
import { ok, fail, failFromRepoError } from "../../_respond.js";

const repo = mockRepository;

export async function onRequestGet(context) {
  try {
    const rows = await repo.listPricesForProduct(context.params.id);
    return ok(rows);
  } catch (err) {
    if (err instanceof RepoError) return failFromRepoError(err);
    return fail("FETCH_FAILED", "Gagal mengambil data harga.", 500);
  }
}

export async function onRequestPut(context) {
  let body;
  try {
    body = await context.request.json();
  } catch {
    return fail("INVALID_BODY", "Body request tidak valid.", 400);
  }
  try {
    const row = await repo.upsertPrice(context.params.id, body);
    return ok(row);
  } catch (err) {
    if (err instanceof RepoError) return failFromRepoError(err);
    return fail("UPDATE_FAILED", "Gagal menyimpan harga.", 500);
  }
}
