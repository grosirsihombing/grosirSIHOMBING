/**
 * core/utils.js — helper murni, tidak menyimpan state, tidak memanggil API.
 */

export function formatRupiah(amount) {
  const n = Number(amount) || 0;
  return "Rp" + n.toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

export function formatDate(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (isNaN(d.getTime())) return "-";
  return (
    d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  );
}

export function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

export function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

/** Status pembayaran -> warna badge (PRD section 37) */
export function statusBayarBadge(status) {
  const map = { Lunas: "success", "Belum Lunas": "danger", Sebagian: "warning" };
  return map[status] || "neutral";
}

/** Stok Saat Ini -> warna badge (dipakai modul Stok, Phase 4). */
export function stockLevelBadge(stok) {
  const n = Number(stok) || 0;
  if (n <= 0) return "danger";
  if (n <= 5) return "warning";
  return "success";
}

export function stockLevelLabel(stok) {
  const n = Number(stok) || 0;
  if (n <= 0) return "Habis";
  if (n <= 5) return "Rendah";
  return "Aman";
}

/**
 * Angka -> terbilang Bahasa Indonesia (dipakai Kwitansi, Phase 7 — PRD
 * section 54). Cuma menangani bilangan bulat non-negatif, cukup untuk total
 * transaksi toko (tidak perlu desimal/minus).
 */
export function terbilang(amount) {
  const SATUAN = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan"];

  function words(n) {
    n = Math.floor(n);
    if (n < 12) return SATUAN[n] || (n === 10 ? "sepuluh" : n === 11 ? "sebelas" : "nol");
    if (n < 20) return `${words(n - 10)} belas`;
    if (n < 100) return `${words(Math.floor(n / 10))} puluh${n % 10 ? " " + words(n % 10) : ""}`;
    if (n < 200) return `seratus${n % 100 ? " " + words(n % 100) : ""}`;
    if (n < 1000) return `${words(Math.floor(n / 100))} ratus${n % 100 ? " " + words(n % 100) : ""}`;
    if (n < 2000) return `seribu${n % 1000 ? " " + words(n % 1000) : ""}`;
    if (n < 1000000) return `${words(Math.floor(n / 1000))} ribu${n % 1000 ? " " + words(n % 1000) : ""}`;
    if (n < 1000000000) return `${words(Math.floor(n / 1000000))} juta${n % 1000000 ? " " + words(n % 1000000) : ""}`;
    return `${words(Math.floor(n / 1000000000))} miliar${n % 1000000000 ? " " + words(n % 1000000000) : ""}`;
  }

  const n = Math.max(0, Math.round(Number(amount) || 0));
  if (n === 0) return "nol rupiah";
  const label = words(n).trim().replace(/\s+/g, " ");
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} rupiah`;
}
