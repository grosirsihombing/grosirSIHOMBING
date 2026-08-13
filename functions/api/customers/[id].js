/**
 * functions/api/customers/[id].js
 * Route: GET /api/customers/:id
 *        PUT /api/customers/:id
 */

import { mockRepository, RepoError } from "../../repositories/mockRepository.js";
import { ok, fail, failFromRepoError } from "../_respond.js";

const repo = mockRepository;

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
