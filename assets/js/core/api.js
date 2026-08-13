/**
 * core/api.js
 *
 * Satu-satunya jalur komunikasi frontend ke backend.
 * PRD section 4: "Frontend tidak boleh membaca Google Sheets secara langsung."
 * PRD section 49: standar response { success, data } / { success, data, pagination } / { success:false, error }
 *
 * Semua modul (products.js, sales.js, dst) HARUS memanggil lewat objek `Api`
 * ini — jangan panggil fetch() langsung dari modul lain.
 */

const Api = (() => {
  const BASE = "/api";

  class ApiError extends Error {
    constructor(code, message, status) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }

  async function request(path, { method = "GET", body, params } = {}) {
    let url = BASE + path;

    if (params && Object.keys(params).length) {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
      );
      url += `?${qs.toString()}`;
    }

    let res;
    try {
      res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr) {
      // Jaringan putus / server tidak bisa dihubungi sama sekali
      throw new ApiError("NETWORK_ERROR", "Tidak dapat terhubung ke server.", 0);
    }

    let json;
    try {
      json = await res.json();
    } catch {
      throw new ApiError("INVALID_RESPONSE", "Respons server tidak valid.", res.status);
    }

    if (!res.ok || json.success === false) {
      const err = json.error || {};
      throw new ApiError(
        err.code || "UNKNOWN_ERROR",
        err.message || "Terjadi kesalahan. Silakan coba lagi.",
        res.status
      );
    }

    return json; // { success, data, pagination? }
  }

  return {
    ApiError,
    get: (path, params) => request(path, { method: "GET", params }),
    post: (path, body) => request(path, { method: "POST", body }),
    put: (path, body) => request(path, { method: "PUT", body }),
    del: (path) => request(path, { method: "DELETE" }),
  };
})();

export default Api;
