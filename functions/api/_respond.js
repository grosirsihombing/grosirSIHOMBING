/**
 * functions/api/_respond.js
 * Helper bersama untuk format response standar PRD section 49.
 * Bukan route — nama diawali underscore supaya Cloudflare Pages Functions
 * tidak menganggapnya sebagai endpoint.
 */

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function ok(data) {
  return json({ success: true, data });
}

export function okList(data, pagination) {
  return json({ success: true, data, pagination });
}

export function fail(code, message, status = 400) {
  return json({ success: false, error: { code, message } }, status);
}

/** Petakan RepoError -> HTTP response yang konsisten. */
export function failFromRepoError(err) {
  const status = String(err.code || "").endsWith("_NOT_FOUND")
    ? 404
    : err.code === "VALIDATION_ERROR" || err.code === "INSUFFICIENT_STOCK"
    ? 400
    : 500;
  return fail(err.code || "UNKNOWN_ERROR", err.message || "Terjadi kesalahan.", status);
}
