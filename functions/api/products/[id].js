/**
 * functions/api/products/[id].js
 * Route: GET /api/products/:id
 *        PUT /api/products/:id
 */

import { mockRepository, RepoError } from "../../repositories/mockRepository.js";
import { ok, fail, failFromRepoError } from "../_respond.js";

const repo = mockRepository;

export async function onRequestGet(context) {
  try {
    const row = await repo.getProduct(context.params.id);
    return ok(row);
  } catch (err) {
    if (err instanceof RepoError) return failFromRepoError(err);
    return fail("FETCH_FAILED", "Gagal mengambil data barang.", 500);
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
    const row = await repo.updateProduct(context.params.id, body);
    return ok(row);
  } catch (err) {
    if (err instanceof RepoError) return failFromRepoError(err);
    return fail("UPDATE_FAILED", "Gagal memperbarui barang.", 500);
  }
}

export async function onRequestDelete(context) {
  try {
    const row = await repo.deleteProduct(context.params.id);
    return ok(row);
  } catch (err) {
    if (err instanceof RepoError) return failFromRepoError(err);
    return fail("DELETE_FAILED", "Gagal menghapus barang.", 500);
  }
}
