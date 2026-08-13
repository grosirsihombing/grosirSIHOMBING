/**
 * functions/api/products/index.js
 * Route: GET /api/products?search=&page=&limit=   (PRD section 46-47)
 *        GET /api/products?barcode=...            (PRD section 13 — scanner)
 *        POST /api/products                       (PRD section 48)
 *
 * `barcode` dan `search` sengaja dipisah, bukan digabung ke satu param:
 * `search` = substring match di beberapa field (nama/barcode/ID) untuk kotak
 * pencarian bebas; `barcode` = exact match khusus dipakai scanner (section 13)
 * supaya kontrak 0/1/banyak hasil-nya pasti, tidak kebawa cocok sebagian
 * seperti substring search.
 */

import { mockRepository, RepoError } from "../../repositories/mockRepository.js";
import { okList, ok, fail, failFromRepoError } from "../_respond.js";

const repo = mockRepository;

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const search = url.searchParams.get("search") || "";
  const barcode = url.searchParams.get("barcode") || "";
  const page = url.searchParams.get("page") || "1";
  const limit = url.searchParams.get("limit") || "50";

  const { data, pagination } = await repo.listProducts({ page, limit, search, barcode });
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
    const row = await repo.createProduct(body);
    return ok(row);
  } catch (err) {
    if (err instanceof RepoError) return failFromRepoError(err);
    return fail("CREATE_FAILED", "Gagal menyimpan barang.", 500);
  }
}
