/**
 * sw.js — Service Worker Zensheet (Phase 8: PWA)
 *
 * Tujuan minimal V1 (bukan full offline-first app):
 *  - Membuat app installable (syarat PWA: manifest + SW dengan fetch handler).
 *  - Static assets (css/js/icons) di-cache supaya load kedua+ lebih cepat & tahan koneksi jelek.
 *  - Halaman HTML: network-first (selalu coba versi terbaru dulu), fallback ke cache saat offline.
 *  - `/api/...` TIDAK PERNAH di-cache — data transaksional (stok, harga, dsb.) harus selalu fresh
 *    dari server, sesuai prinsip data real-time di PRD. Cache API akan menyembunyikan perubahan stok.
 *
 * Naikkan CACHE_VERSION setiap deploy signifikan supaya klien lama otomatis bersih-bersih cache.
 */

const CACHE_VERSION = "zensheet-cache-v1";

const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/assets/css/base.css",
  "/assets/css/layout.css",
  "/assets/css/components.css",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png",
  "/assets/icons/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {
        // Best-effort -- jangan sampai gagal install SW hanya karena satu aset app-shell 404.
      })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

const STATIC_ASSET_RE = /\.(?:css|js|mjs|png|jpg|jpeg|webp|svg|ico|woff2?)$/i;

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Data API: selalu network, tidak pernah cache/fallback (lebih baik gagal terang-terangan
  // saat offline daripada diam-diam menampilkan stok/harga basi).
  if (url.pathname.startsWith("/api/")) return;

  if (STATIC_ASSET_RE.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response && response.ok) {
              const clone = response.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Halaman HTML (navigasi): network-first supaya selalu dapat versi terbaru saat online,
  // fallback ke cache (lalu ke dashboard) hanya saat benar-benar offline.
  if (request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/pages/dashboard.html")))
    );
  }
});
