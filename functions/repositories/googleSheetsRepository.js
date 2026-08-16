const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzrq5QPekTkVUyUYfvCv1PaPmbfMmQynysNKoQwFn1tiO4TIbBSZ9xTwrmgnA95Mcj0gQ/exec";

export class RepoError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "RepoError";
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Cache di Cloudflare KV (binding "GROSIR_CACHE", lihat wrangler.toml) —
// upgrade dari cache in-memory sebelumnya, supaya cache-nya konsisten lintas
// isolate Worker, bukan cuma "best-effort selama isolate masih warm".
//
// Aturan tetap sama seperti sebelumnya:
//   - HANYA Products / Customers / Suppliers yang di-cache (data master,
//     jarang berubah). Sales & Inventory TIDAK di-cache — harus selalu
//     real-time (stok & transaksi).
//   - Cache di-invalidate begitu ada create/update di data master terkait
//     (termasuk Harga_Barang, karena listProducts_ di Apps Script menempel
//     data harga ke tiap produk — lihat cacheClear("products") di
//     createPrice/updatePrice di bawah).
//   - TIDAK menyentuh arsitektur Stok_Saat_Ini/Master_Barang — perhitungan
//     stok tetap 100% di Apps Script (getInventoryBase_), tidak diubah sama
//     sekali oleh perubahan ini.
//
// Skema key: "<bucket>:<key>", mis. "products:{"page":"1",...}" atau
// "products:get:BRG-001" — semua entri satu bucket berbagi prefix yang sama,
// jadi invalidasi ("clear") tinggal list+delete semua key dengan prefix itu,
// tanpa perlu tahu di muka kombinasi search/page/limit apa saja yang pernah
// di-cache.
//
// Catatan penting soal KV: TTL minimum Cloudflare KV adalah 60 detik (nilai
// di bawah itu ditolak), dan write KV itu "eventually consistent" (propagasi
// ke edge lain bisa perlu waktu, biasanya beberapa detik, kadang lebih) —
// untuk toko dengan satu titik akses ini tidak masalah, tapi disebutkan di
// sini supaya tidak mengira ini sekuat cache database biasa.
// ---------------------------------------------------------------------------

const CACHE_TTL_SECONDS = 60; // = minimum yang diizinkan Cloudflare KV

async function cacheGet(kv, bucket, key) {
  if (!kv) return undefined; // tidak ada binding KV -> caching nonaktif, selalu ke Apps Script
  try {
    const raw = await kv.get(`${bucket}:${key}`);
    if (raw == null) return undefined;
    console.log("[Cache] HIT", bucket, key);
    return JSON.parse(raw);
  } catch (err) {
    console.log("[Cache] ERROR get", bucket, key, err.message);
    return undefined;
  }
}

async function cacheSet(kv, bucket, key, data) {
  if (!kv) return;
  try {
    await kv.put(`${bucket}:${key}`, JSON.stringify(data), {
      expirationTtl: CACHE_TTL_SECONDS,
    });
  } catch (err) {
    console.log("[Cache] ERROR set", bucket, key, err.message);
  }
}

async function cacheClear(kv, bucket) {
  if (!kv) return;
  try {
    let cursor;
    let deleted = 0;
    do {
      const page = await kv.list({ prefix: `${bucket}:`, cursor });
      await Promise.all(page.keys.map((k) => kv.delete(k.name)));
      deleted += page.keys.length;
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
    console.log("[Cache] CLEAR", bucket, `(${deleted} keys)`);
  } catch (err) {
    console.log("[Cache] ERROR clear", bucket, err.message);
  }
}

function cacheKeyFrom(params) {
  return JSON.stringify(
    Object.keys(params)
      .sort()
      .reduce((acc, k) => {
        acc[k] = params[k];
        return acc;
      }, {})
  );
}

async function appsScriptRequest({
  resource,
  action = "",
  params = {},
  method = "GET",
  body = null,
}) {
  const url = new URL(APPS_SCRIPT_URL);

  url.searchParams.set("resource", resource);

  if (action) {
    url.searchParams.set("action", action);
  }

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  let response;

  const requestStart = Date.now();

  console.log("[AppsScript] START:", resource, action || "GET");

  try {
    response = await fetch(url.toString(), {
      method,
      headers: body
        ? {
            "Content-Type": "application/json",
          }
        : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    console.log("[AppsScript] FETCH selesai:", resource, Date.now() - requestStart, "ms");
  } catch {
    console.log("[AppsScript] FETCH gagal:", resource, Date.now() - requestStart, "ms");

    throw new RepoError("BACKEND_UNAVAILABLE", "Google Apps Script tidak dapat dihubungi.");
  }

  let json;

  try {
    json = await response.json();
  } catch {
    throw new RepoError("INVALID_BACKEND_RESPONSE", "Respons Google Apps Script tidak valid.");
  }

  if (!response.ok || json.success === false) {
    const error = json.error || {};

    throw new RepoError(
      error.code || "BACKEND_ERROR",
      error.message || "Google Apps Script mengalami kesalahan."
    );
  }

  return json;
}

/**
 * Factory — dipanggil per-request dengan `context.env.GROSIR_CACHE` (binding
 * KV, lihat wrangler.toml) supaya semua fungsi cache di bawah bisa membaca/
 * menulis ke KV itu. Kalau `kv` tidak diberikan (mis. lupa di-pass di salah
 * satu endpoint), repository ini tetap berfungsi normal — cuma tanpa cache
 * (langsung ke Apps Script tiap kali), tidak akan error.
 */
export function createGoogleSheetsRepository(kv) {
  /**
   * GET daftar products.
   */
  async function listProducts({ page = "1", limit = "50", search = "", barcode = "" } = {}) {
    const cacheKey = cacheKeyFrom({ page, limit, search, barcode });
    const cached = await cacheGet(kv, "products", cacheKey);
    if (cached) return cached;

    const result = await appsScriptRequest({
      resource: "products",
      params: {
        page,
        limit,
        search,
        barcode,
      },
    });

    const data = Array.isArray(result.data)
      ? result.data
      : Array.isArray(result.data?.data)
        ? result.data.data
        : [];

    const pagination =
      result.pagination ||
      result.data?.pagination || {
        page: Number(page),
        limit: Number(limit),
        total: data.length,
      };

    const output = {
      data,
      pagination,
    };
    await cacheSet(kv, "products", cacheKey, output);
    return output;
  }

  /**
   * GET satu product.
   */
  async function getProduct(id) {
    if (!id) {
      throw new RepoError("VALIDATION_ERROR", "ID_Barang wajib diisi.");
    }

    const cacheKey = `get:${id}`;
    const cached = await cacheGet(kv, "products", cacheKey);
    if (cached) return cached;

    const result = await appsScriptRequest({
      resource: "products",
      action: "get",
      params: {
        id,
      },
    });

    if (!result.data) {
      throw new RepoError("NOT_FOUND", "Barang tidak ditemukan.");
    }

    await cacheSet(kv, "products", cacheKey, result.data);
    return result.data;
  }

  /**
   * CREATE product.
   */
  async function createProduct(input = {}) {
    const result = await appsScriptRequest({
      resource: "products",
      method: "POST",
      body: input,
    });

    await cacheClear(kv, "products");
    return result.data;
  }

  /**
   * UPDATE product.
   *
   * Apps Script menggunakan POST + action=update.
   */
  async function updateProduct(id, input = {}) {
    if (!id) {
      throw new RepoError("VALIDATION_ERROR", "ID_Barang wajib diisi.");
    }

    const body = {
      ...input,
      ID_Barang: id,
    };

    const result = await appsScriptRequest({
      resource: "products",
      action: "update",
      method: "POST",
      body,
    });

    await cacheClear(kv, "products");
    return result.data;
  }

  /**
   * GET daftar harga.
   */
  async function listPrices(ID_Barang = "") {
    const result = await appsScriptRequest({
      resource: "prices",
      params: {
        ID_Barang,
      },
    });

    return Array.isArray(result.data) ? result.data : [];
  }

  async function updatePrice(input = {}) {
    if (!input.ID_Harga) {
      throw new RepoError("VALIDATION_ERROR", "ID_Harga wajib diisi.");
    }

    const result = await appsScriptRequest({
      resource: "prices",
      action: "update",
      method: "POST",
      body: input,
    });

    // listProducts_ di Apps Script menempel Harga_Barang ke tiap produk —
    // kalau harga berubah, cache products jadi basi juga.
    await cacheClear(kv, "products");
    return result.data;
  }

  /**
   * CREATE harga.
   */
  async function createPrice(input = {}) {
    const result = await appsScriptRequest({
      resource: "prices",
      method: "POST",
      body: input,
    });

    await cacheClear(kv, "products");
    return result.data;
  }

  /**
   * CREATE stok masuk.
   */
  async function createStockIn(input = {}) {
    const result = await appsScriptRequest({
      resource: "stock-in",
      method: "POST",
      body: input,
    });

    return result.data;
  }

  async function createSale(input = {}) {
    const result = await appsScriptRequest({
      resource: "sales",
      method: "POST",
      body: input,
    });

    return result.data;
  }

  async function listSales({ page = "1", limit = "50", search = "" } = {}) {
    const result = await appsScriptRequest({
      resource: "sales",
      params: {
        page,
        limit,
        search,
      },
    });

    const data = Array.isArray(result.data)
      ? result.data
      : Array.isArray(result.data?.data)
        ? result.data.data
        : [];

    const pagination =
      result.pagination ||
      result.data?.pagination || {
        page: Number(page),
        limit: Number(limit),
        total: data.length,
      };

    return {
      data,
      pagination,
    };
  }

  async function listInventory({ page = "1", limit = "50", search = "" } = {}) {
    const result = await appsScriptRequest({
      resource: "inventory",
      params: {
        page,
        limit,
        search,
      },
    });

    const data = Array.isArray(result.data)
      ? result.data
      : Array.isArray(result.data?.data)
        ? result.data.data
        : [];

    const pagination =
      result.pagination ||
      result.data?.pagination || {
        page: Number(page),
        limit: Number(limit),
        total: data.length,
      };

    return {
      data,
      pagination,
    };
  }

  async function createStockAdjustment(input = {}) {
    const result = await appsScriptRequest({
      resource: "adjustments",
      method: "POST",
      body: input,
    });

    return result.data;
  }

  /* ----------------------------- Customers ----------------------------- */

  async function listCustomers({ page = "1", limit = "50", search = "" } = {}) {
    const cacheKey = cacheKeyFrom({ page, limit, search });
    const cached = await cacheGet(kv, "customers", cacheKey);
    if (cached) return cached;

    const result = await appsScriptRequest({
      resource: "customers",
      params: { page, limit, search },
    });

    const data = Array.isArray(result.data)
      ? result.data
      : Array.isArray(result.data?.data)
        ? result.data.data
        : [];

    const pagination =
      result.pagination ||
      result.data?.pagination || {
        page: Number(page),
        limit: Number(limit),
        total: data.length,
      };

    const output = { data, pagination };
    await cacheSet(kv, "customers", cacheKey, output);
    return output;
  }

  async function getCustomer(id) {
    if (!id) {
      throw new RepoError("VALIDATION_ERROR", "ID_Customer wajib diisi.");
    }

    const cacheKey = `get:${id}`;
    const cached = await cacheGet(kv, "customers", cacheKey);
    if (cached) return cached;

    const result = await appsScriptRequest({
      resource: "customers",
      action: "get",
      params: { id },
    });

    if (!result.data) {
      throw new RepoError("NOT_FOUND", "Customer tidak ditemukan.");
    }

    await cacheSet(kv, "customers", cacheKey, result.data);
    return result.data;
  }

  async function createCustomer(input = {}) {
    const result = await appsScriptRequest({
      resource: "customers",
      method: "POST",
      body: input,
    });

    await cacheClear(kv, "customers");
    return result.data;
  }

  async function updateCustomer(id, input = {}) {
    if (!id) {
      throw new RepoError("VALIDATION_ERROR", "ID_Customer wajib diisi.");
    }

    const body = { ...input, ID_Customer: id };

    const result = await appsScriptRequest({
      resource: "customers",
      action: "update",
      method: "POST",
      body,
    });

    await cacheClear(kv, "customers");
    return result.data;
  }

  /* ----------------------------- Suppliers ----------------------------- */

  async function listSuppliers({ page = "1", limit = "50", search = "" } = {}) {
    const cacheKey = cacheKeyFrom({ page, limit, search });
    const cached = await cacheGet(kv, "suppliers", cacheKey);
    if (cached) return cached;

    const result = await appsScriptRequest({
      resource: "suppliers",
      params: { page, limit, search },
    });

    const data = Array.isArray(result.data)
      ? result.data
      : Array.isArray(result.data?.data)
        ? result.data.data
        : [];

    const pagination =
      result.pagination ||
      result.data?.pagination || {
        page: Number(page),
        limit: Number(limit),
        total: data.length,
      };

    const output = { data, pagination };
    await cacheSet(kv, "suppliers", cacheKey, output);
    return output;
  }

  async function getSupplier(id) {
    if (!id) {
      throw new RepoError("VALIDATION_ERROR", "ID_Supplier wajib diisi.");
    }

    const cacheKey = `get:${id}`;
    const cached = await cacheGet(kv, "suppliers", cacheKey);
    if (cached) return cached;

    const result = await appsScriptRequest({
      resource: "suppliers",
      action: "get",
      params: { id },
    });

    if (!result.data) {
      throw new RepoError("NOT_FOUND", "Supplier tidak ditemukan.");
    }

    await cacheSet(kv, "suppliers", cacheKey, result.data);
    return result.data;
  }

  async function createSupplier(input = {}) {
    const result = await appsScriptRequest({
      resource: "suppliers",
      method: "POST",
      body: input,
    });

    await cacheClear(kv, "suppliers");
    return result.data;
  }

  async function updateSupplier(id, input = {}) {
    if (!id) {
      throw new RepoError("VALIDATION_ERROR", "ID_Supplier wajib diisi.");
    }

    const body = { ...input, ID_Supplier: id };

    const result = await appsScriptRequest({
      resource: "suppliers",
      action: "update",
      method: "POST",
      body,
    });

    await cacheClear(kv, "suppliers");
    return result.data;
  }

  /* -------------------------- Sales (detail/cancel) ----------------------- */

  async function getSale(id) {
    if (!id) {
      throw new RepoError("VALIDATION_ERROR", "ID_Trx wajib diisi.");
    }

    const result = await appsScriptRequest({
      resource: "sales",
      action: "get",
      params: { id },
    });

    if (!result.data) {
      throw new RepoError("NOT_FOUND", "Transaksi tidak ditemukan.");
    }

    return result.data;
  }

  async function updateSaleStatus(id, input = {}) {
    if (!id) {
      throw new RepoError("VALIDATION_ERROR", "ID_Trx wajib diisi.");
    }

    // Apps Script saat ini cuma menyediakan "batalkan transaksi" (Aktif=false)
    // lewat resource=sales&action=delete — belum ada endpoint untuk mengubah
    // status lain (mis. Status_Bayar) setelah transaksi tersimpan.
    if (input.Aktif === false) {
      const result = await appsScriptRequest({
        resource: "sales",
        action: "delete",
        method: "POST",
        body: { ID_Trx: id },
      });
      return result.data;
    }

    throw new RepoError(
      "NOT_SUPPORTED",
      "Perubahan status transaksi selain pembatalan belum didukung backend."
    );
  }

  /* --------------------------- Prices (per barang) ------------------------ */

  async function listPricesForProduct(ID_Barang) {
    return listPrices(ID_Barang);
  }

  async function upsertPrice(ID_Barang, input = {}) {
    if (!ID_Barang) {
      throw new RepoError("VALIDATION_ERROR", "ID_Barang wajib diisi.");
    }

    const kategori = String(input.Kategori_Pelanggan || "").trim();
    if (!kategori) {
      throw new RepoError("VALIDATION_ERROR", "Kategori_Pelanggan wajib diisi.");
    }

    // Sama seperti mockRepository: cari dulu baris harga existing untuk
    // (ID_Barang, kategori) itu — kalau ada, UPDATE; kalau belum, CREATE.
    const existing = await listPrices(ID_Barang);
    const match = existing.find((p) => String(p.Kategori_Pelanggan) === kategori);

    const body = {
      ID_Barang,
      Kategori_Pelanggan: kategori,
      Harga_Default: input.Harga_Default,
      Boleh_Edit_Harga: !!input.Boleh_Edit_Harga,
    };

    if (match) {
      return updatePrice({ ...body, ID_Harga: match.ID_Harga });
    }
    return createPrice(body);
  }

  return {
    listProducts,
    getProduct,
    createProduct,
    updateProduct,
    listPrices,
    updatePrice,
    createPrice,
    listPricesForProduct,
    upsertPrice,
    listInventory,
    listSales,
    getSale,
    updateSaleStatus,
    createSale,
    createStockIn,
    createStockAdjustment,
    listCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    listSuppliers,
    getSupplier,
    createSupplier,
    updateSupplier,
  };
}

// Singleton tanpa KV (fallback) — dipertahankan untuk kompatibilitas kalau
// ada file yang belum sempat diarahkan ke createGoogleSheetsRepository(kv).
// Tetap bekerja normal, hanya saja tanpa cache (selalu ke Apps Script).
export const googleSheetsRepository = createGoogleSheetsRepository(null);
