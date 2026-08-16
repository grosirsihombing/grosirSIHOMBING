/**
 * functions/api/products/[id].js
 * Route:
 * GET    /api/products/:id
 * PUT    /api/products/:id
 * DELETE /api/products/:id -> soft delete
 */

import {
  googleSheetsRepository,
  RepoError,
} from "../../repositories/googleSheetsRepository.js";

import { ok, fail, failFromRepoError } from "../_respond.js";

export async function onRequestGet(context) {
  try {
    const row = await googleSheetsRepository.getProduct(context.params.id);
    return ok(row);
  } catch (err) {
    if (err instanceof RepoError) return failFromRepoError(err);

    return fail(
      "FETCH_FAILED",
      "Gagal mengambil data barang.",
      500
    );
  }
}

export async function onRequestPut(context) {
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
    const row = await googleSheetsRepository.updateProduct(
      context.params.id,
      body
    );

    return ok(row);
  } catch (err) {
    if (err instanceof RepoError) return failFromRepoError(err);

    return fail(
      "UPDATE_FAILED",
      "Gagal memperbarui barang.",
      500
    );
  }
}

export async function onRequestDelete(context) {
  try {
    const row = await googleSheetsRepository.updateProduct(
      context.params.id,
      { Aktif: false }
    );

    return ok(row);
  } catch (err) {
    if (err instanceof RepoError) return failFromRepoError(err);

    return fail(
      "DELETE_FAILED",
      "Gagal menonaktifkan barang.",
      500
    );
  }
}