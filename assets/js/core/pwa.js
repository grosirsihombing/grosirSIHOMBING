/**
 * core/pwa.js — Phase 8: registrasi Service Worker.
 * Dipanggil sekali dari renderShell() (core/shell.js) supaya jalan di semua halaman ber-shell.
 */
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  // Cloudflare Pages selalu HTTPS di production; skip di http:// non-localhost (mis. preview aneh)
  // supaya tidak error di console browser lama.
  if (location.protocol !== "https:" && location.hostname !== "localhost") return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Diam-diam gagal -- SW cuma peningkatan (offline cache + installability), bukan syarat app jalan.
    });
  });
}
