/**
 * functions/api/sales/[id].js
 * Route: GET /api/sales/:id -> detail transaksi + item (untuk nota/detail view)
 */

import { mockRepository, RepoError } from "../../repositories/mockRepository.js";
import { ok, fail, failFromRepoError } from "../_respond.js";

const repo = mockRepository;

export async function onRequestGet(context) {
  try {
    const row = await repo.getSale(context.params.id);
    return ok(row);
  } catch (err) {
    if (err instanceof RepoError) return failFromRepoError(err);
    return fail("FETCH_FAILED", "Gagal mengambil data transaksi.", 500);
  }
}

export async function onRequestDelete(context) {
  try {
    const row = await repo.deleteSale(context.params.id);
    return ok(row);
  } catch (err) {
    if (err instanceof RepoError) return failFromRepoError(err);
    return fail("DELETE_FAILED", "Gagal membatalkan transaksi.", 500);
  }
}
