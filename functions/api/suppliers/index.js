/**
 * functions/api/suppliers/index.js
 * Route: GET /api/suppliers?search=&page=&limit=
 *        POST /api/suppliers
 */

import { createGoogleSheetsRepository, RepoError } from "../../repositories/googleSheetsRepository.js";
import { okList, ok, fail, failFromRepoError } from "../_respond.js";


export async function onRequestGet(context) {
  const repo = createGoogleSheetsRepository(context.env.GROSIR_CACHE);
  const url = new URL(context.request.url);
  const search = url.searchParams.get("search") || "";
  const page = url.searchParams.get("page") || "1";
  const limit = url.searchParams.get("limit") || "50";

  const { data, pagination } = await repo.listSuppliers({ page, limit, search });
  return okList(data, pagination);
}

export async function onRequestPost(context) {
  const repo = createGoogleSheetsRepository(context.env.GROSIR_CACHE);
  let body;
  try {
    body = await context.request.json();
  } catch {
    return fail("INVALID_BODY", "Body request tidak valid.", 400);
  }
  try {
    const row = await repo.createSupplier(body);
    return ok(row);
  } catch (err) {
    if (err instanceof RepoError) return failFromRepoError(err);
    return fail("CREATE_FAILED", "Gagal menyimpan supplier.", 500);
  }
}
