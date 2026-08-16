/**
 * functions/api/prices/index.js
 *
 * GET  /api/prices?ID_Barang=BRG-001
 * POST /api/prices
 *
 * Harga master bisa diedit jika Boleh_Edit_Harga = true.
 */

import {
  googleSheetsRepository,
  RepoError,
} from "../../repositories/googleSheetsRepository.js";

import {
  ok,
  fail,
  failFromRepoError,
} from "../_respond.js";

export async function onRequestGet(context) {
  const url = new URL(context.request.url);

  const ID_Barang =
    url.searchParams.get("ID_Barang") || "";

  try {
    const data =
      await googleSheetsRepository.listPrices(ID_Barang);

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
      await googleSheetsRepository.updatePrice(body);

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