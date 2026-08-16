/**
 * functions/api/prices/index.js
 *
 * GET  /api/prices?ID_Barang=BRG-001
 * POST /api/prices
 *
 * Harga master bisa diedit jika Boleh_Edit_Harga = true.
 */

import {
  createGoogleSheetsRepository,
  RepoError,
} from "../../repositories/googleSheetsRepository.js";

import {
  ok,
  fail,
  failFromRepoError,
} from "../_respond.js";

export async function onRequestGet(context) {
  const repo = createGoogleSheetsRepository(context.env.GROSIR_CACHE);

  const url = new URL(context.request.url);

  const ID_Barang =
    url.searchParams.get("ID_Barang") || "";

  try {
    const data =
      await repo.listPrices(ID_Barang);

    return ok(data);
  } catch (err) {
    if (err instanceof RepoError) {
      return failFromRepoError(err);
    }

    return fail(
      "PRICES_LOAD_FAILED",
      "Gagal mengambil data harga.",
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
    const data =
      await repo.updatePrice(body);

    return ok(data);
  } catch (err) {
    if (err instanceof RepoError) {
      return failFromRepoError(err);
    }

    return fail(
      "PRICE_UPDATE_FAILED",
      "Gagal memperbarui harga.",
      500
    );
  }
}