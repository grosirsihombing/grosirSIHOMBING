/**
 * functions/api/dashboard/summary.js
 * Route (Cloudflare Pages Functions file-based routing): GET /api/dashboard/summary
 *
 * PRD section 45: "Dashboard tidak boleh mengambil seluruh data transaksi ke
 * browser. Gunakan API agregasi." Backend yang menghitung summary, bukan frontend.
 *
 * Query params opsional (Phase 6 — PRD section 44 "Penjualan periode tertentu"):
 *   ?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Kalau tidak dikirim, backend default ke 7 hari terakhir (lihat
 * repositories/mockRepository.js -> getDashboardSummary). Kalau salah satu
 * dikirim, keduanya wajib ada dan from <= to (VALIDATION_ERROR kalau tidak).
 *
 * Repository di-swap di sini nanti: ganti `mockRepository` -> `googleSheetsRepository`
 * begitu Phase 2 selesai. Endpoint/response shape TIDAK berubah (PRD section 78).
 */

import { mockRepository, RepoError } from "../../repositories/mockRepository.js";
import { ok, fail, failFromRepoError } from "../_respond.js";

const repo = mockRepository;

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const from = url.searchParams.get("from") || undefined;
  const to = url.searchParams.get("to") || undefined;

  try {
    const summary = await repo.getDashboardSummary({ from, to });
    return ok(summary);
  } catch (err) {
    if (err instanceof RepoError) return failFromRepoError(err);
    return fail("SUMMARY_FAILED", "Gagal mengambil ringkasan dashboard.", 500);
  }
}
