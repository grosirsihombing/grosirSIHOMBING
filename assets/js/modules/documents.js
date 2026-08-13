/**
 * modules/documents.js — Nota/Struk & Kwitansi (Phase 7 — PRD section 54-55).
 *
 * V1 scope sesuai PRD section 54: prioritasnya "Cetak" / "Simpan (Print)"
 * lewat dialog print browser (Ctrl+P -> Save as PDF) — kirim email masih
 * "Future". Dua dokumen dibangun di atas data yang sama, endpoint yang sudah
 * ada sejak Phase 3 (`GET /api/sales/:id`, lihat komentar di
 * functions/api/sales/[id].js: "untuk nota/detail view"):
 *
 *   - Nota/Struk (initPrintNota)  -> rincian item, PRD section 55.
 *   - Kwitansi   (initPrintKwitansi) -> bukti terima pembayaran, format umum
 *     kwitansi Indonesia (jumlah + terbilang + tanda tangan), berdasarkan
 *     Total & Status_Bayar transaksi yang sama.
 *
 * Kedua halaman TIDAK memakai app-shell (lihat pages/print-nota.html &
 * pages/print-kwitansi.html) supaya hasil print/PDF bersih, cuma dokumennya.
 */

import Api from "../core/api.js";
import { formatRupiah, formatDate, formatDateTime, escapeHtml, terbilang, statusBayarBadge } from "../core/utils.js";

function getIdFromUrl() {
  return new URLSearchParams(window.location.search).get("id") || "";
}

function renderToolbar(root, { onPrint }) {
  const bar = document.createElement("div");
  bar.className = "print-toolbar no-print";
  bar.innerHTML = `
    <a class="btn btn--sm print-toolbar__back" href="sales.html">← Kembali ke Penjualan</a>
    <button type="button" class="btn btn--sm btn--primary" data-print-btn>🖨️ Print / Simpan PDF</button>
  `;
  bar.querySelector("[data-print-btn]").addEventListener("click", onPrint);
  root.appendChild(bar);
}

function renderState(root, html) {
  root.innerHTML = "";
  const block = document.createElement("div");
  block.className = "print-page";
  block.innerHTML = `<div class="print-doc state-block">${html}</div>`;
  root.appendChild(block);
}

async function fetchSaleOrShowError(root) {
  const id = getIdFromUrl();
  if (!id) {
    renderState(root, `<div>ID transaksi tidak ditemukan di alamat halaman.</div>`);
    return null;
  }
  try {
    const res = await Api.get(`/sales/${id}`);
    return res.data;
  } catch (err) {
    renderState(
      root,
      `<div>Gagal memuat transaksi <strong>${escapeHtml(id)}</strong>.</div><div class="text-muted">${escapeHtml(
        err.message || ""
      )}</div>`
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// Nota / Struk — PRD section 55: rincian item, print-friendly.
// ---------------------------------------------------------------------------

export async function initPrintNota() {
  const root = document.querySelector("#printRoot");
  if (!root) return;

  const sale = await fetchSaleOrShowError(root);
  if (!sale) return;

  document.title = `Nota ${sale.ID_Trx} — Toko Grosir SIHOMBING`;

  root.innerHTML = "";
  renderToolbar(root, { onPrint: () => window.print() });

  const page = document.createElement("div");
  page.className = "print-page";
  page.innerHTML = `
    <div class="print-doc">
      <div class="print-doc__header">
        <div class="print-doc__brand">TOKO GROSIR SIHOMBING</div>
        <div class="print-doc__sub">Nota / Struk Penjualan</div>
      </div>

      <dl class="print-doc__meta">
        <div><dt>No. Transaksi</dt><dd>${escapeHtml(sale.ID_Trx)}</dd></div>
        <div><dt>Tanggal</dt><dd>${formatDateTime(sale.Created_At)}</dd></div>
        <div><dt>Customer</dt><dd>${escapeHtml(sale.Nama_Customer)}</dd></div>
        <div><dt>Status Pembayaran</dt><dd><span class="badge badge--${statusBayarBadge(sale.Status_Bayar)}">${escapeHtml(sale.Status_Bayar)}</span></dd></div>
      </dl>

      <table class="print-doc__table">
        <thead>
          <tr>
            <th>Barang</th>
            <th style="text-align:right;">Qty</th>
            <th style="text-align:right;">Harga</th>
            <th style="text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${sale.Items.map(
            (i) => `<tr>
              <td>${escapeHtml(i.Nama_Barang)}</td>
              <td style="text-align:right;">${i.Qty}</td>
              <td style="text-align:right;">${formatRupiah(i.Harga_Satuan)}</td>
              <td style="text-align:right;">${formatRupiah(i.Subtotal)}</td>
            </tr>`
          ).join("")}
        </tbody>
        <tfoot>
          <tr class="print-doc__total-row">
            <td colspan="3">TOTAL</td>
            <td style="text-align:right;">${formatRupiah(sale.Total)}</td>
          </tr>
        </tfoot>
      </table>

      <div class="text-muted" style="font-size:12px;">Metode bayar: ${escapeHtml(sale.Metode_Bayar)}</div>
      ${sale.Catatan ? `<div class="text-muted" style="font-size:12px; margin-top:4px;">Catatan: ${escapeHtml(sale.Catatan)}</div>` : ""}

      <div class="print-doc__footer">Terima kasih atas kunjungan Anda 🙏</div>
    </div>
  `;
  root.appendChild(page);
}

// ---------------------------------------------------------------------------
// Kwitansi — bukti terima pembayaran (PRD section 54).
// ---------------------------------------------------------------------------

export async function initPrintKwitansi() {
  const root = document.querySelector("#printRoot");
  if (!root) return;

  const sale = await fetchSaleOrShowError(root);
  if (!sale) return;

  document.title = `Kwitansi ${sale.ID_Trx} — Toko Grosir SIHOMBING`;

  root.innerHTML = "";
  renderToolbar(root, { onPrint: () => window.print() });

  const page = document.createElement("div");
  page.className = "print-page";
  page.innerHTML = `
    <div class="print-doc">
      <div class="print-doc__header">
        <div class="print-doc__brand">TOKO GROSIR SIHOMBING</div>
        <div class="print-doc__sub">Kwitansi Pembayaran</div>
      </div>

      <dl class="print-doc__meta">
        <div><dt>No. Kwitansi</dt><dd>${escapeHtml(sale.ID_Trx)}</dd></div>
        <div><dt>Tanggal</dt><dd>${formatDate(sale.Tanggal)}</dd></div>
      </dl>

      <p class="kwitansi__line">Sudah terima dari&nbsp;: <strong>${escapeHtml(sale.Nama_Customer)}</strong></p>
      <p class="kwitansi__line">Untuk pembayaran&nbsp;: Transaksi <strong>${escapeHtml(sale.ID_Trx)}</strong> (${escapeHtml(sale.Items.length)} jenis barang)</p>
      <p class="kwitansi__line">Metode bayar&nbsp;: ${escapeHtml(sale.Metode_Bayar)} &nbsp;·&nbsp; Status&nbsp;: <span class="badge badge--${statusBayarBadge(sale.Status_Bayar)}">${escapeHtml(sale.Status_Bayar)}</span></p>

      <div class="kwitansi__amount">${formatRupiah(sale.Total)}</div>
      <p class="text-center text-muted" style="font-size:12px; margin-top:-8px;">Terbilang: <em>${escapeHtml(terbilang(sale.Total))}</em></p>

      <div class="kwitansi__signature">
        <div class="kwitansi__signature-box">
          <div>Toko Grosir SIHOMBING</div>
          <div class="kwitansi__signature-space"></div>
          <div class="text-muted">(______________________)</div>
        </div>
      </div>

      <div class="print-doc__footer">Terima kasih atas kunjungan Anda 🙏</div>
    </div>
  `;
  root.appendChild(page);
}
