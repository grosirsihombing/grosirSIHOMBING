/**
 * functions/api/products/index.js
 *
 * GET  /api/products?search=&page=&limit=
 * GET  /api/products?barcode=...
 * POST /api/products
 */

import {
  createGoogleSheetsRepository,
  RepoError,
} from "../../repositories/googleSheetsRepository.js";

import {
  okList,
  ok,
  fail,
  failFromRepoError,
} from "../_respond.js";

export async function onRequestGet(context) {
  const repo = createGoogleSheetsRepository(context.env.GROSIR_CACHE);

  const url = new URL(context.request.url);

  const search = url.searchParams.get("search") || "";
  const barcode = url.searchParams.get("barcode") || "";
  const page = url.searchParams.get("page") || "1";
  const limit = url.searchParams.get("limit") || "50";

  try {
    const { data, pagination } =
      await repo.listProducts({
        page,
        limit,
        search,
        barcode,
      });

    return okList(data, pagination);
  } catch (err) {
    if (err instanceof RepoError) {
      return failFromRepoError(err);
    }

    console.error("GET /api/products failed:", err);

    return fail(
      "PRODUCTS_LOAD_FAILED",
      "Gagal mengambil data barang.",
      500
    );
  }
}

export async function onRequestPost(context) {
  const repo = createGoogleSheetsRepository(context.env.GROSIR_CACHE);

  let body;

  try {
    body = await context.request.json();
  } catch {
    return fail(
      "INVALID_BODY",
      "Body request tidak valid.",
      400
    );
  }

  try {
    const row =
      await repo.createProduct(body);

    return ok(row);
  } catch (err) {
    if (err instanceof RepoError) {
      return failFromRepoError(err);
    }

    console.error("POST /api/products failed:", err);

    return fail(
      "CREATE_FAILED",
      "Gagal menyimpan barang.",
      500
    );
  }
}