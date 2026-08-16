/**
 * functions/api/customers/index.js
 * Route: GET /api/customers?search=&page=&limit=
 *        POST /api/customers
 */

import { googleSheetsRepository, RepoError } from "../../repositories/googleSheetsRepository.js";
import { okList, ok, fail, failFromRepoError } from "../_respond.js";

const repo = googleSheetsRepository;

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const search = url.searchParams.get("search") || "";
  const page = url.searchParams.get("page") || "1";
  const limit = url.searchParams.get("limit") || "50";

  const { data, pagination } = await repo.listCustomers({ page, limit, search });
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
    const row = await repo.createCustomer(body);
    return ok(row);
  } catch (err) {
    if (err instanceof RepoError) return failFromRepoError(err);
    return fail("CREATE_FAILED", "Gagal menyimpan customer.", 500);
  }
}
