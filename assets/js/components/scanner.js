/**
 * components/scanner.js — Phase 5 (Barcode).
 *
 * Dua lapis API:
 *
 *   openScanner({ onResult })
 *     Modal kamera + input manual. Memanggil onResult(barcode) SEKALI saat
 *     sebuah kode berhasil didapat (dari kamera ATAU diketik manual), lalu
 *     modal menutup diri sendiri. Tidak tahu apa-apa soal produk/API — murni
 *     "dapatkan string barcode dari user".
 *
 *   scanProduct({ onFound, onNotFound, onMultiple, filterAktif })
 *     Helper siap pakai: buka openScanner(), lalu query
 *     GET /api/products?barcode=... dan terapkan 3 kondisi PRD section 13:
 *       0 hasil  -> toast "Produk tidak ditemukan" (bisa dioverride onNotFound)
 *       1 hasil  -> langsung onFound(product)
 *       2+ hasil -> tampilkan daftar, user pilih, baru onFound(product)
 *                   (bisa dioverride onMultiple untuk perilaku lain, mis.
 *                   products.js memilih untuk memfilter tabel alih-alih
 *                   membuka daftar pilihan kedua)
 *     Ini yang dipakai modules/sales.js, modules/inventory.js,
 *     modules/products.js supaya ketiganya konsisten tanpa duplikasi logic.
 *
 * Kamera bersifat progressive enhancement (PRD section 7 — target Chrome,
 * Edge, Safari, Firefox; tidak semuanya dukung BarcodeDetector native):
 *   1. Coba BarcodeDetector native (Chrome/Edge/Android) — zero-dependency.
 *   2. Kalau tidak ada, lazy-load ZXing dari CDN via dynamic import (Safari/
 *      Firefox) — tidak menambah beban ke halaman yang tidak memakai scanner.
 *   3. Kalau kamera tidak tersedia sama sekali (izin ditolak, device tanpa
 *      kamera, http non-secure) — input manual tetap berfungsi penuh.
 * Tidak ada kondisi yang menghasilkan error tak tertangani; selalu ada jalan
 * keluar ke pencarian/input manual (PRD section 13, kondisi 1).
 */

import { openModal } from "./modal.js";
import { toast } from "./toast.js";
import { escapeHtml } from "../core/utils.js";
import { lookupProductsByBarcode } from "../core/barcodeLookup.js";

const ZXING_CDN_URL = "https://esm.sh/@zxing/browser@0.1.5";
const DETECT_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"];

function hasCameraSupport() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

function hasNativeDetector() {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

/**
 * Buka modal scanner. Mengembalikan { stop } untuk menutup dari luar kalau
 * perlu (jarang dipakai — modal sudah menutup diri sendiri saat dapat hasil
 * atau saat user klik X/Batal/Escape).
 */
export function openScanner({ onResult, title = "Scan Barcode" } = {}) {
  let stream = null;
  let stopDetectLoop = null;
  let settled = false;

  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="scanner">
      <div class="scanner__camera" data-camera-wrap>
        <video data-scanner-video playsinline muted></video>
        <div class="scanner__hint" data-camera-status>Meminta izin kamera...</div>
      </div>
      <div class="field" style="margin-top:14px;">
        <label class="field__label">Atau ketik barcode manual</label>
        <div style="display:flex; gap:8px;">
          <input class="field__control" type="text" placeholder="Ketik/tempel barcode lalu Enter" id="scannerManualInput" autocomplete="off" inputmode="numeric" />
          <button type="button" class="btn" id="scannerManualBtn">Cari</button>
        </div>
      </div>
    </div>
  `;

  const close = openModal({ title, bodyNode: wrap, hideFooter: true });

  const videoEl = wrap.querySelector("[data-scanner-video]");
  const statusEl = wrap.querySelector("[data-camera-status]");
  const cameraWrap = wrap.querySelector("[data-camera-wrap]");
  const manualInput = wrap.querySelector("#scannerManualInput");
  const manualBtn = wrap.querySelector("#scannerManualBtn");

  function teardown() {
    if (stopDetectLoop) {
      stopDetectLoop();
      stopDetectLoop = null;
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
  }

  function finish(rawValue) {
    if (settled) return;
    const code = String(rawValue || "").trim();
    if (!code) return;
    settled = true;
    teardown();
    close();
    onResult(code);
  }

  manualBtn.addEventListener("click", () => finish(manualInput.value));
  manualInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      finish(manualInput.value);
    }
  });

  if (!hasCameraSupport()) {
    cameraWrap.style.display = "none";
    manualInput.focus();
  } else {
    startCamera().catch(() => {
      cameraWrap.classList.add("scanner__camera--unavailable");
      statusEl.textContent = "Kamera tidak dapat diakses — gunakan input manual di bawah.";
      manualInput.focus();
    });
  }

  async function startCamera() {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    if (settled) {
      // Modal sudah ditutup (mis. user langsung ketik manual) sebelum kamera
      // sempat menyala — jangan lanjut, langsung matikan stream.
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    videoEl.srcObject = stream;
    await videoEl.play();
    statusEl.textContent = "Arahkan kamera ke barcode...";

    if (hasNativeDetector()) {
      runNativeDetector();
    } else {
      runZXingFallback();
    }
  }

  function runNativeDetector() {
    let detector;
    try {
      detector = new window.BarcodeDetector({ formats: DETECT_FORMATS });
    } catch {
      detector = new window.BarcodeDetector();
    }
    let cancelled = false;
    let frameHandle = null;
    stopDetectLoop = () => {
      cancelled = true;
      if (frameHandle) cancelAnimationFrame(frameHandle);
    };
    const tick = async () => {
      if (cancelled) return;
      try {
        const codes = await detector.detect(videoEl);
        if (codes && codes[0] && codes[0].rawValue) {
          finish(codes[0].rawValue);
          return;
        }
      } catch {
        // frame belum siap / video belum punya dimensi — abaikan, coba lagi
      }
      frameHandle = requestAnimationFrame(tick);
    };
    tick();
  }

  async function runZXingFallback() {
    statusEl.textContent = "Memuat pemindai...";
    let ZXingBrowser;
    try {
      ZXingBrowser = await import(ZXING_CDN_URL);
    } catch {
      statusEl.textContent = "Pemindai kamera tidak dapat dimuat — gunakan input manual di bawah.";
      return;
    }
    if (settled) return;

    const reader = new ZXingBrowser.BrowserMultiFormatReader();
    let cancelled = false;
    stopDetectLoop = () => {
      cancelled = true;
      try {
        reader.reset();
      } catch {
        // sudah berhenti / video sudah dilepas — aman diabaikan
      }
    };
    statusEl.textContent = "Arahkan kamera ke barcode...";
    try {
      await reader.decodeFromVideoElement(videoEl, (result) => {
        if (cancelled || !result) return;
        finish(result.getText());
      });
    } catch {
      if (!cancelled) statusEl.textContent = "Pemindai kamera gagal — gunakan input manual di bawah.";
    }
  }

  return {
    stop: close,
  };
}

// ---------------------------------------------------------------------------
// scanProduct — openScanner() + lookup + kontrak 3 kondisi PRD section 13
// ---------------------------------------------------------------------------

function defaultOnNotFound(barcode) {
  toast.error(`Barcode "${barcode}" tidak ditemukan — coba cari manual.`);
}

function defaultOnMultiple(products, pick) {
  const wrap = document.createElement("div");
  wrap.innerHTML = `<div class="text-muted" style="margin-bottom:10px;">Barcode ini dipakai oleh ${products.length} barang berbeda (PRD section 12) — pilih salah satu:</div>`;
  const list = document.createElement("div");
  wrap.appendChild(list);

  const close = openModal({ title: "Pilih Barang", bodyNode: wrap, hideFooter: true });

  products.forEach((p) => {
    const item = document.createElement("div");
    item.className = "search-result-item";
    item.innerHTML = `
      <strong>${escapeHtml(p.Nama_Barang)}</strong>
      <span class="text-muted">${p.Tipe_Komoditi ? "— " + escapeHtml(p.Tipe_Komoditi) : ""}</span>
    `;
    item.addEventListener("click", () => {
      close();
      pick(p);
    });
    list.appendChild(item);
  });
}

/**
 * @param {Object} opts
 * @param {(product: object) => void} opts.onFound - dipanggil dengan TEPAT satu produk (baik karena hasilnya 1, atau karena user memilih dari daftar duplikat).
 * @param {(barcode: string) => void} [opts.onNotFound] - default: toast error.
 * @param {(products: object[], pick: (p:object)=>void) => void} [opts.onMultiple] - default: modal daftar pilihan.
 * @param {boolean} [opts.filterAktif=true] - buang barang nonaktif dari hasil (barang yang sudah tidak dijual sebaiknya tidak ikut ke-scan ke transaksi).
 * @param {string} [opts.title]
 */
export function scanProduct({ onFound, onNotFound = defaultOnNotFound, onMultiple = defaultOnMultiple, filterAktif = true, title } = {}) {
  openScanner({
    title: title || "Scan Barang",
    onResult: async (barcode) => {
      let rows;
      try {
        rows = await lookupProductsByBarcode(barcode);
      } catch {
        toast.error("Gagal mencari barang berdasarkan barcode. Coba lagi.");
        return;
      }
      if (filterAktif) rows = rows.filter((r) => r.Aktif);

      if (rows.length === 0) {
        onNotFound(barcode);
        return;
      }
      if (rows.length === 1) {
        onFound(rows[0]);
        return;
      }
      onMultiple(rows, onFound);
    },
  });
}

// Kompatibilitas nama lama (dipakai sebelum stub diganti) — alias ke openScanner.
export const initScanner = openScanner;
