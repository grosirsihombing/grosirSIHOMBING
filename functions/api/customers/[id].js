/**
 * functions/api/customers/[id].js
 * Route: GET /api/customers/:id
 *        PUT /api/customers/:id
 *        DELETE /api/customers/:id -> soft delete (Aktif=false)
 */

import { googleSheetsRepository, RepoError } from "../../repositories/googleSheetsRepository.js";
import { ok, fail, failFromRepoError } from "../_respond.js";

const repo = googleSheetsRepository;

export async function onRequestGet(context) {
  try {
    const row = await repo.getCustomer(context.params.id);
    return ok(row);
  } catch (err) {
    if (err instanceof RepoError) return failFromRepoError(err);
    return fail("FETCH_FAILED", "Gagal mengambil data customer.", 500);
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
    const row = await repo.updateCustomer(context.params.id, body);
    return ok(row);
  } catch (err) {
    if (err instanceof RepoError) return failFromRepoError(err);
    return fail("UPDATE_FAILED", "Gagal memperbarui customer.", 500);
  }
}

export async function onRequestDelete(context) {
  try {
    const row = await repo.updateCustomer(context.params.id, { Aktif: false });
    return ok(row);
  } catch (err) {
    if (err instanceof RepoError) return failFromRepoError(err);
    return fail("DELETE_FAILED", "Gagal menonaktifkan customer.", 500);
  }
}
